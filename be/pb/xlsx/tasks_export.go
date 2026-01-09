package xlsx

import (
	"bytes"
	"encoding/json"
	stdhtml "html"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/xuri/excelize/v2"
	nethtml "golang.org/x/net/html"
)

type exportLabels struct {
	Headers map[string]string `json:"headers"`
	Status  map[string]string `json:"status"`
}

var (
	labelsOnce sync.Once
	labelsCfg  exportLabels
	labelsErr  error
)

func HandleTaskExport(app *pocketbase.PocketBase, c *core.RequestEvent) error {
	filter := strings.TrimSpace(c.Request.URL.Query().Get("filter"))
	exportAll := c.Request.URL.Query().Get("exportAll") == "true"
	if exportAll {
		filter = ""
	}
	if !exportAll && filter == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing filter"})
	}

	records, err := app.FindRecordsByFilter("tasks", filter, "-created", 0, 0)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	for _, rec := range records {
		if errs := app.ExpandRecord(rec, []string{"departments", "assignees"}, nil); len(errs) > 0 {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to expand relations"})
		}
	}

	labels := getExportLabels()
	f := excelize.NewFile()
	sheet := f.GetSheetName(0)
	headerLabels := defaultHeaderLabels()
	headerKeys := []string{"title", "description", "status", "departments", "assignees"}
	for i, key := range headerKeys {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, labelOrDefault(labels.Headers, key, headerLabels[key]))
	}

	for i, rec := range records {
		row := i + 2
		_ = f.SetCellValue(sheet, "A"+strconv.Itoa(row), rec.GetString("title"))
		_ = f.SetCellValue(sheet, "B"+strconv.Itoa(row), htmlToText(rec.GetString("description")))
		_ = f.SetCellValue(sheet, "C"+strconv.Itoa(row), statusLabel(rec.GetString("status"), labels.Status))
		_ = f.SetCellValue(sheet, "D"+strconv.Itoa(row), joinExpandedNames(rec, "departments"))
		_ = f.SetCellValue(sheet, "E"+strconv.Itoa(row), joinExpandedNames(rec, "assignees"))
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	}

	filename := "tasks_" + time.Now().Format("20060102_150405") + ".xlsx"
	c.Response.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response.Header().Set("Content-Disposition", "attachment; filename=\""+filename+"\"")
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

func joinExpandedNames(rec *core.Record, field string) string {
	names := make([]string, 0)
	for _, r := range rec.ExpandedAll(field) {
		names = append(names, r.GetString("name"))
	}
	return strings.Join(names, ", ")
}

func htmlToText(input string) string {
	if strings.TrimSpace(input) == "" {
		return ""
	}

	root, err := nethtml.Parse(strings.NewReader(input))
	if err != nil {
		return stdhtml.UnescapeString(stripTagsFallback(input))
	}

	var b strings.Builder
	walkHTMLText(&b, root)
	return strings.TrimSpace(stdhtml.UnescapeString(b.String()))
}

func statusLabel(code string, labels map[string]string) string {
	if v := labelOrDefault(labels, code, ""); v != "" {
		return v
	}
	if v := labelOrDefault(defaultStatusLabels(), code, ""); v != "" {
		return v
	}
	return code
}

func walkHTMLText(b *strings.Builder, n *nethtml.Node) {
	if n.Type == nethtml.TextNode {
		b.WriteString(n.Data)
		return
	}

	if n.Type == nethtml.ElementNode {
		switch strings.ToLower(n.Data) {
		case "br":
			b.WriteString("\n")
		case "p":
			b.WriteString("\n")
		case "li":
			b.WriteString("\n- ")
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walkHTMLText(b, c)
	}
}

func stripTagsFallback(input string) string {
	var b strings.Builder
	inTag := false
	for _, r := range input {
		switch r {
		case '<':
			inTag = true
		case '>':
			inTag = false
		default:
			if !inTag {
				b.WriteRune(r)
			}
		}
	}
	return b.String()
}

func labelOrDefault(labels map[string]string, key string, fallback string) string {
	if labels == nil {
		return fallback
	}
	if v, ok := labels[key]; ok && v != "" {
		return v
	}
	return fallback
}

func defaultHeaderLabels() map[string]string {
	return map[string]string{
		"title":       "Tiêu đề",
		"description": "Mô tả",
		"status":      "Trạng thái",
		"departments": "Ban",
		"assignees":   "Phụ trách",
	}
}

func defaultStatusLabels() map[string]string {
	return map[string]string{
		"todo":        "Chưa làm",
		"in_progress": "Đang làm",
		"done":        "Đã xong",
	}
}

func getExportLabels() exportLabels {
	labelsOnce.Do(func() {
		data, err := os.ReadFile(labelsPath())
		if err != nil {
			labelsErr = err
			return
		}
		if err := json.Unmarshal(data, &labelsCfg); err != nil {
			labelsErr = err
			return
		}
		if labelsCfg.Headers == nil {
			labelsCfg.Headers = map[string]string{}
		}
		if labelsCfg.Status == nil {
			labelsCfg.Status = map[string]string{}
		}
	})
	if labelsErr != nil {
		return exportLabels{}
	}
	return labelsCfg
}

func labelsPath() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		return "labels.json"
	}
	return filepath.Join(filepath.Dir(file), "labels.json")
}

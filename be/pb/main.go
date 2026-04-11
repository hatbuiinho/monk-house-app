package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"

	"be.monk.house/mattermost"
	"be.monk.house/notification"
	"be.monk.house/tasks/xlsx"
)

func main() {
	// Load .env
	_ = godotenv.Load()

	// Read version from ENV
	version := os.Getenv("VERSION")
	if version == "" {
		version = "unknown"
	}

	app := pocketbase.New()

	app.OnRecordAfterCreateSuccess("tasks").BindFunc(func(e *core.RecordEvent) error {
		channelIds := []string{}
		departmentIds := e.Record.GetStringSlice("departments")
		assigneeIds := e.Record.GetStringSlice("assignees")
		// Get Mattermost channels from assignees
		for _, userId := range assigneeIds {
			user, err := app.FindRecordById("users", userId)
			if err == nil && user != nil {
				mmChannel := user.GetString("mm_channel")
				if mmChannel != "" {
					channelIds = append(channelIds, mmChannel)
				}
			}
		}

		// Get Mattermost channels from departments
		for _, deptId := range departmentIds {
			dept, err := app.FindRecordById("departments", deptId)
			if err == nil && dept != nil {
				mattermostChannel := dept.GetString("mattermost_channel")
				if mattermostChannel != "" {
					channelIds = append(channelIds, mattermostChannel)
				}
			}
		}

		taskTitle := e.Record.Get("title")
		taskDetailLink := fmt.Sprintf("%s/%s", os.Getenv("APP_URL"), e.Record.Id)
		message := fmt.Sprintf("**%s %s**\n%s%s", "[Công việc mới]", taskTitle, "Vui lòng xác nhận và xem chi tiết công việc tại link sau: ", taskDetailLink)

		_, err := notification.PostMessageToMattermost(channelIds, message)
		if err != nil {
			log.Println(err)
		}
		return e.Next()
	})

	// fires only for "tasks" collections
	app.OnRecordCreateRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		if !e.Auth.IsSuperuser() {
			e.Record.Set("createdBy", e.Auth.Id)
		}

		return e.Next()
	})

	// fires only for "tasks" collections
	app.OnRecordUpdateRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		if !e.Auth.IsSuperuser() {
			e.Record.Set("updatedBy", e.Auth.Id)
		}

		return e.Next()
	})

	app.OnRecordDeleteRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		return e.Next()
	})

	// Mattermost OAuth2 Routes
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		notification.RegisterRoute(e)
		xlsx.RegisterRoute(e, app)
		if err := mattermost.RegisterRoute(e, app); err != nil {
			return err
		}

		// Health check
		e.Router.GET("/health", func(c *core.RequestEvent) error {
			return c.JSON(200, map[string]string{"status": "ok"})
		})

		// Version endpoint
		e.Router.GET("/version", func(c *core.RequestEvent) error {
			return c.JSON(200, map[string]string{
				"version": version,
			})
		})

		// Existing hello route
		e.Router.GET("/hello", func(c *core.RequestEvent) error {
			return c.String(200, "Hello world!")
		}).Bind(apis.RequireAuth())

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

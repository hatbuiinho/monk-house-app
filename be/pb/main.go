package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
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

	// fires only for "tasks" collections
	app.OnRecordCreateRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		// e.App
		// e.Collection
		// e.Record
		// and all RequestEvent fields...
		if !e.Auth.IsSuperuser() {
			e.Record.Set("createdBy", e.Auth.Id)
		}
		return e.Next()
	})

	// fires only for "tasks" collections
	app.OnRecordUpdateRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		// e.App
		// e.Collection
		// e.Record
		// and all RequestEvent fields...
		if !e.Auth.IsSuperuser() {
			e.Record.Set("updatedBy", e.Auth.Id)
		}
		return e.Next()
	})

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		log.Println("PocketBase server starting with custom routes...")
		// register new "GET /hello" route
		e.Router.GET("/hello", func(e *core.RequestEvent) error {
			return e.String(200, "Hello world!")
		}).Bind(apis.RequireAuth())

		// Example: custom route
		e.Router.GET("/health", func(c *core.RequestEvent) error {
			return c.JSON(200, map[string]string{"status": "ok"})
		})

		e.Router.GET("/version", func(c *core.RequestEvent) error {
			return c.JSON(200, map[string]string{
				"version": version,
			})
		})

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

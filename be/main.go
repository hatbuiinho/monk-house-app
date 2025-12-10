package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

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

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

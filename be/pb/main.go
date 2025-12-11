package main
import (
	"log"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/joho/godotenv"
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

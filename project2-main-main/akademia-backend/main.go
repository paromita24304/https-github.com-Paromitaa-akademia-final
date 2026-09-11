package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"akademia-backend/internal/config"
	"akademia-backend/internal/handlers"

	"github.com/joho/godotenv"
)

// enableCORS wraps handlers to allow cross-origin requests from the React frontend.
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:5173"
		}

		w.Header().Set("Access-Control-Allow-Origin", frontendURL)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found, using system environment variables.")
	}

	config.ConnectDB()

	// Authentication routes
	http.HandleFunc("/api/register", enableCORS(handlers.Register))
	http.HandleFunc("/api/login", enableCORS(handlers.Login))
	http.HandleFunc("/api/change-password", enableCORS(handlers.ChangePassword))
	http.HandleFunc("/api/student/enrollments", enableCORS(handlers.StudentEnrollment))
	http.HandleFunc("/api/student/progress", enableCORS(handlers.StudentProgress))
	http.HandleFunc("/api/student/feedback", enableCORS(handlers.StudentFeedback))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	fmt.Printf("Server running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

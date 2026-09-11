package handlers

import (
  "database/sql"
  "encoding/json"
  "net/http"
  "os"
  "strconv"
  "strings"
  "time"

  "akademia-backend/internal/config"
  "github.com/golang-jwt/jwt/v5"
)

func studentID(r *http.Request) (int, bool) {
  raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
  token, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
    return []byte(os.Getenv("JWT_SECRET")), nil
  })
  if err != nil || !token.Valid { return 0, false }
  claims, ok := token.Claims.(jwt.MapClaims); if !ok { return 0, false }
  value, ok := claims["user_id"].(float64); return int(value), ok
}

func StudentEnrollment(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type", "application/json")
  userID, ok := studentID(r); if !ok { http.Error(w, "{\"message\":\"Unauthorized\"}", 401); return }
  if r.Method == http.MethodGet {
    rows, err := config.DB.Query("SELECT course_id FROM course_enrollments WHERE user_id=$1", userID)
    if err != nil { http.Error(w, "{\"message\":\"Database error\"}",500); return }; defer rows.Close()
    ids:=[]string{}; for rows.Next(){ var id string; if rows.Scan(&id)==nil { ids=append(ids,id) } }
    json.NewEncoder(w).Encode(map[string]any{"courseIds":ids}); return
  }
  if r.Method != http.MethodPost { http.Error(w,"Method not allowed",405); return }
  var input struct{ CourseID string `json:"courseId"` }; json.NewDecoder(r.Body).Decode(&input)
  if strings.TrimSpace(input.CourseID)=="" { http.Error(w,"{\"message\":\"courseId is required\"}",400); return }
  _, err := config.DB.Exec("INSERT INTO course_enrollments (user_id,course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",userID,input.CourseID)
  if err != nil { http.Error(w,"{\"message\":\"Database error\"}",500); return }
  w.WriteHeader(http.StatusCreated); json.NewEncoder(w).Encode(map[string]string{"message":"Enrolled"})
}

func StudentProgress(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type","application/json")
  userID, ok := studentID(r); if !ok { http.Error(w,"{\"message\":\"Unauthorized\"}",401); return }
  courseID:=r.URL.Query().Get("courseId")
  if r.Method==http.MethodGet {
    rows,err:=config.DB.Query("SELECT lesson_id FROM lesson_progress WHERE user_id=$1 AND course_id=$2 AND completed=true",userID,courseID)
    if err!=nil { http.Error(w,"{\"message\":\"Database error\"}",500);return };defer rows.Close()
    ids:=[]string{};for rows.Next(){var id string;if rows.Scan(&id)==nil{ids=append(ids,id)}};json.NewEncoder(w).Encode(map[string]any{"lessonIds":ids});return
  }
  var input struct{CourseID string `json:"courseId"`;LessonID string `json:"lessonId"`;Completed bool `json:"completed"`};json.NewDecoder(r.Body).Decode(&input)
  _,err:=config.DB.Exec("INSERT INTO lesson_progress (user_id,course_id,lesson_id,completed,completed_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,course_id,lesson_id) DO UPDATE SET completed=EXCLUDED.completed,completed_at=EXCLUDED.completed_at",userID,input.CourseID,input.LessonID,input.Completed,sql.NullTime{Time:time.Now(),Valid:input.Completed})
  if err!=nil { http.Error(w,"{\"message\":\"Database error\"}",500);return };json.NewEncoder(w).Encode(map[string]string{"message":"Progress saved"})
}

func StudentFeedback(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Content-Type","application/json")
  userID,ok:=studentID(r);if !ok{http.Error(w,"{\"message\":\"Unauthorized\"}",401);return}
  var input struct{CourseID string `json:"courseId"`;Rating int `json:"rating"`;Message string `json:"message"`};json.NewDecoder(r.Body).Decode(&input)
  if input.Rating<1||input.Rating>5||strings.TrimSpace(input.Message)==""{http.Error(w,"{\"message\":\"Invalid feedback\"}",400);return}
  _,err:=config.DB.Exec("INSERT INTO course_feedback (user_id,course_id,rating,message) VALUES ($1,$2,$3,$4)",userID,input.CourseID,input.Rating,input.Message)
  if err!=nil{http.Error(w,"{\"message\":\"Database error\"}",500);return};w.WriteHeader(http.StatusCreated);json.NewEncoder(w).Encode(map[string]string{"message":"Feedback saved"})
}

func parseID(value string) int { id,_:=strconv.Atoi(value);return id }

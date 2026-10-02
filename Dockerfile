# Single-image build: React frontend is compiled and served by the Spring Boot backend.
# Suited to hosts that run one container per app (e.g. Render free tier).

# ---- Frontend build ----
FROM node:lts-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---- Backend build ----
FROM eclipse-temurin:25-jdk AS backend
WORKDIR /build
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q
COPY backend/src/ src/
# Built SPA goes into Spring's static resources so it is served from /
COPY --from=frontend /app/dist/ src/main/resources/static/
RUN ./mvnw clean package -DskipTests -q

# ---- Runtime ----
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app
RUN groupadd --gid 1001 appgroup \
 && useradd --uid 1001 --gid 1001 --no-create-home --shell /sbin/nologin appuser
COPY --from=backend /build/target/*.jar app.jar
RUN chown appuser:appgroup app.jar
USER appuser

# Render injects PORT; Spring reads it via server.port=${PORT:8080}
EXPOSE 8080
# Tuned for a 512 MB container
ENV JAVA_OPTS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1"
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]

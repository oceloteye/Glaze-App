# ---- Build stage ----
FROM eclipse-temurin:25-jdk AS builder
WORKDIR /build

# Copy Maven wrapper and POM first — cached unless pom.xml changes
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q

# Copy source and build
COPY src/ src/
RUN ./mvnw clean package -DskipTests -q

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

# Create a dedicated non-root user
RUN groupadd --gid 1001 appgroup \
 && useradd --uid 1001 --gid 1001 --no-create-home --shell /sbin/nologin appuser

COPY --from=builder /build/target/*.jar app.jar
RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

# CORS_ALLOWED_ORIGINS — comma-separated list of allowed origins.
# Default: http://localhost:5173 (handled in WebConfig.java).
# In production set e.g.: -e CORS_ALLOWED_ORIGINS=https://your-frontend.example.com
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -jar app.jar"]

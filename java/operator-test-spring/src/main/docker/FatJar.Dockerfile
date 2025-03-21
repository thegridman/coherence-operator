FROM gcr.io/distroless/java17-debian12

COPY ${project.artifactId}-${project.version}.jar /app/libs/${project.artifactId}-${project.version}.jar

ENTRYPOINT ["java", "-jar", "/app/libs/${project.artifactId}-${project.version}.jar"]
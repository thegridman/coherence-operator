FROM ${coherence.compatibility.coherence.image} AS builder

USER root
COPY target/classes/build.sh build.sh
COPY --chmod=544 target/operator-compatibility-*.jar /app/libs/operator-compatibility.jar
RUN ["java", "-cp", "/app/libs/operator-compatibility.jar", "com.oracle.coherence.k8s.testing.Setup"]

FROM ${coherence.test.base.image}

COPY --from=builder /app/ /app/

ENTRYPOINT ["java", "-XshowSettings:all", "-XX:+PrintCommandLineFlags", "-XX:+PrintFlagsFinal", "-Dcoherence.ttl=0", "-cp", "/coherence/ext/conf:/coherence/ext/lib/*:/app/resources:/app/classes:/app/libs/*", "com.oracle.coherence.k8s.testing.RestServer"]

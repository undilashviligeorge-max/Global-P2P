FROM rust:1.84-bookworm AS chef
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /
COPY --from=chef /app/target/release/backend /usr/local/bin/backend

ENV RUST_BACKTRACE=0
EXPOSE 8080

USER nobody
CMD ["/usr/local/bin/backend"]

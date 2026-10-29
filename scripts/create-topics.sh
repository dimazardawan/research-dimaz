#!/bin/bash
echo "=== Membuat Kafka Topics ==="

KAFKA_BIN="/opt/kafka/bin/kafka-topics.sh"
BOOTSTRAP="localhost:9092"

topics=("workflow.trigger" "failure.detected" "recovery.result" "dlq.unresolved")

for topic in "${topics[@]}"; do
  echo "Membuat topic: $topic"
  docker exec kafka-broker $KAFKA_BIN \
    --bootstrap-server $BOOTSTRAP \
    --create --topic "$topic" \
    --partitions 1 \
    --replication-factor 1 \
    --if-not-exists
done

echo ""
echo "=== Daftar topic yang terbuat ==="
docker exec kafka-broker $KAFKA_BIN \
  --bootstrap-server $BOOTSTRAP --list

echo "=== SELESAI ==="
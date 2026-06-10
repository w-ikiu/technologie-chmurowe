# Task Manager — Kubernetes + Monitoring

Aplikacja Task Manager wdrozono na Kubernetes z pelnym stosem monitoringu opartym na Prometheusie i Grafanie.

## Struktura repozytorium

```
app/
  backend/      # kod backendu Node.js i Dockerfile
  frontend/     # frontend HTML i Dockerfile
k8s/
  backend/      # manifesty Kubernetes backendu
  frontend/     # manifesty Kubernetes frontendu
  postgres/     # manifesty Kubernetes PostgreSQL
  ingress/      # manifest Ingress
  monitoring/   # konfiguracja Helm dla monitoringu
    values.yaml
.github/
  workflows/
    ci.yml      # pipeline CI/CD
```

## Wymagania

- Docker Desktop z wlaczonym Kubernetes
- kubectl
- Helm 3

## Uruchomienie aplikacji

### 1. Zainstaluj Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
kubectl get pods -n ingress-nginx -w
```

### 2. Zbuduj obrazy

```bash
docker build -t task-manager-backend:v1 -f app/backend/Dockerfile app/backend
docker build -t task-manager-backend:v2 -f app/backend/Dockerfile.v2 app/backend
docker build -t task-manager-frontend:latest app/frontend
```

### 3. Zastosuj manifesty Kubernetes

```bash
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/ingress/
```

### 4. Sprawdz stan

```bash
kubectl get pods
kubectl get ingress
```

Aplikacja dostepna pod: http://localhost

---

## Instalacja monitoringu

### 1. Zainstaluj Helm

```bash
# Windows
winget install Helm.Helm

# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Weryfikacja:

```bash
helm version
```

### 2. Dodaj repozytorium i zainstaluj stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace monitoring

helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  -f k8s/monitoring/values.yaml
```

Obserwuj postep instalacji (moze zajac 2-3 minuty):

```bash
kubectl get pods -n monitoring -w
```

### 3. Dostep do Grafany

```bash
kubectl port-forward -n monitoring service/monitoring-grafana 3000:80
```

Otworz w przegladarce: http://localhost:3000

- Login: `admin`
- Haslo: `admin123`

### 4. Import dashboardu

1. Kliknij **Dashboards** w lewym menu
2. Wybierz **Import**
3. Wpisz ID dashboardu: `20372`
4. Kliknij **Load**
5. Wybierz zrodlo danych Prometheus
6. Kliknij **Import**

### 5. Dostep do Prometheusa

```bash
kubectl port-forward -n monitoring service/monitoring-kube-promethe-prometheus 9090:9090
```

Otworz w przegladarce: http://localhost:9090

Przykladowe zapytania PromQL:

```promql
# stan wszystkich Podow
kube_pod_status_phase

# zuzycie CPU przez Pody backendu
rate(container_cpu_usage_seconds_total{pod=~"backend.*"}[5m])

# zuzycie RAM w namespace default
container_memory_usage_bytes{namespace="default"}
```

### 6. Odinstalowanie monitoringu

```bash
helm uninstall monitoring -n monitoring
kubectl delete namespace monitoring
```

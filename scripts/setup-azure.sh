#!/usr/bin/env bash
# ==================================================================
#  One-time Azure setup for PrimeClone
#  Creates: Resource Group -> ACR -> AKS (with pull access to ACR)
#
#  Usage:  az login   then   bash scripts/setup-azure.sh
# ==================================================================
set -euo pipefail

# ---- change these if needed (ACR name must be globally unique, lowercase) ----
RG="rg-primeclone"
LOCATION="centralindia"
ACR_NAME="primecloneacr"
AKS_NAME="aks-primeclone"
NODE_COUNT=2
NODE_SIZE="Standard_B2s"
# ---------------------------------------------------------------------------

echo ">> 1/4  Resource group: $RG"
az group create --name "$RG" --location "$LOCATION" --output table

echo ">> 2/4  Container registry: $ACR_NAME"
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --output table

echo ">> 3/4  AKS cluster: $AKS_NAME  (takes ~5-8 minutes)"
az aks create \
  --resource-group "$RG" \
  --name "$AKS_NAME" \
  --node-count "$NODE_COUNT" \
  --node-vm-size "$NODE_SIZE" \
  --attach-acr "$ACR_NAME" \
  --generate-ssh-keys \
  --output table

echo ">> 4/4  Download kubeconfig"
az aks get-credentials --resource-group "$RG" --name "$AKS_NAME" --overwrite-existing
kubectl get nodes

echo ""
echo "Done. Put this in azure-pipelines.yml -> acrLoginServer:"
az acr show --name "$ACR_NAME" --query loginServer --output tsv

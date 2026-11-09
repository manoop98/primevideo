#!/usr/bin/env bash
# Deletes EVERYTHING created for PrimeClone (stop the billing after class)
set -euo pipefail
RG="rg-primeclone"
read -r -p "Delete resource group '$RG' and all resources in it? (yes/no) " ans
[[ "$ans" == "yes" ]] && az group delete --name "$RG" --yes --no-wait && echo "Deletion started."

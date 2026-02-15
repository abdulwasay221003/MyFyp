"""
Test the deterioration detection endpoint directly
"""
import requests
import json

# Test with Shah's patient ID (P2)
url = "http://localhost:5000/detect_deterioration"

payload = {
    "patient_id": "P2"
}

print(f"Testing deterioration detection for P2 (Shah)...")
print(f"URL: {url}")
print(f"Payload: {payload}")
print("="*60)

try:
    response = requests.post(url, json=payload, timeout=30)
    print(f"Status: {response.status_code}")

    data = response.json()
    print(f"\nResponse:")
    print(json.dumps(data, indent=2))

except requests.exceptions.ConnectionError:
    print("ERROR: Cannot connect to backend. Make sure Flask server is running on port 5000")
except Exception as e:
    print(f"ERROR: {e}")

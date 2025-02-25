
import json
from Curve import Curve

def load_json(file_path):
    """Lädt die JSON-Datei und gibt sie als Dictionary zurück."""
    with open(file_path, 'r') as file:
        return json.load(file)

def create_curve(curve_data):
    """Erstellt ein Curve-Objekt aus den gegebenen Daten."""
    try:
        return Curve(curve_data)
    except Exception as e:
        print(f"Fehler bei der Erstellung der Curve: {e}")
        return None

def interpolate_curve(curve):
    """Berechnet interpolierte Werte für eine Kurve."""
    results = []
    min_time = 1 / 10
    max_time = 11
    t = min_time
    while t <= max_time:
        try:
            rate = curve.getRate(t)
            df = curve.getDF(t)
            results.append((t, rate, df))
        except ValueError as e:
            print(f"Warnung: {e} für t={t:.2f}")
        t += 1 / 10  #Schritte
    return results

def export_results_to_json(results, filename="python_reference_data.json"):
    with open(filename, 'w') as f:
        json.dump(results, f, indent=4)

def save_results(output_file, curve_name, results):
    """Speichert die Ergebnisse in eine Datei."""
    with open(output_file, 'a') as f:
        f.write(f"\n=== {curve_name} ===\n")
        if not results:
            f.write("Keine Ergebnisse für diese Curve.\n")
        else:
            for t, rate, df in results:
                if rate is None or df is None:
                    raise ValueError(f"Fehlerhafte Werte für t={t}: Rate={rate}, DF={df}")
                f.write(f"t={t:.2f}: Rate={rate:.6f}, DF={df:.6f}\n")



def main():
    # Eingabedatei und Ausgabedatei
    input_file = "curves.json"
    output_file = "interpolation_results.txt"
    json_output_file = "python_reference_data.json" 

    # JSON-Daten laden
    data = load_json(input_file)
    
    # Gesamtergebnisse für JSON sammeln
    all_results = {}

    # Datei leeren (für neuen Run)
    open(output_file, 'w').close()

    # Kurven verarbeiten
    for curve_name, curve_data in data.items():
        print(f"Verarbeite {curve_name}...")


        curve = create_curve(curve_data)
        
        if curve:
            results = interpolate_curve(curve)
            save_results(output_file, curve_name, results)
            curve_data["reference"]={
                    "times": [round(t, 6) for t, rate, df in results] if results else [],
                    "dfs": [df for t, rate, df in results] if results else [],
                    "zcs": [rate for t, rate, df in results] if results else []
                }
            all_results[curve_name] = curve_data


    
    export_results_to_json(all_results, json_output_file)

    print(f"Ergebnisse wurden in {output_file} und {json_output_file} gespeichert.")

if __name__ == "__main__":
    main()

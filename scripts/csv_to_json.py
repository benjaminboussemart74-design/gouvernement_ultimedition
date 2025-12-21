#!/usr/bin/env python3
"""
Script pour convertir les fichiers CSV en JSON pour le projet Gouvernement Lecornu II.
Utilise directement les CSV comme source de vérité, sans passer par Excel.
"""

import csv
import json
import sys
from pathlib import Path

def load_csv_data():
    """Charge les données depuis les fichiers CSV."""
    data_dir = Path(__file__).parent.parent

    # Charger persons.csv
    persons = {}
    with open(data_dir / 'Serveur gouvernement - persons.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            person_id = row['id']
            persons[person_id] = row

    # Charger person_careers.csv
    careers = []
    with open(data_dir / 'Serveur gouvernement - person_careers.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            careers.append(row)

    # Charger ministries.csv
    ministries = {}
    with open(data_dir / 'Serveur gouvernement - ministries.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ministry_id = row['id']
            ministries[ministry_id] = row

    # Charger person_ministries.csv
    person_ministries = []
    with open(data_dir / 'Serveur gouvernement - person_ministries.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            person_ministries.append(row)

    return persons, careers, ministries, person_ministries

def build_ministers_json(persons, careers, ministries, person_ministries):
    """Construit la structure JSON finale."""
    ministers = {}

    # Traiter les personnes (ministres et collaborateurs)
    for person_id, person in persons.items():
        role = person['role']

        if role in ['minister', 'minister-delegate']:
            # C'est un ministre
            ministers[person_id] = {
                'id': person_id,
                'name': person['full_name'],
                'role': 'minister',  # Normaliser
                'email': person.get('email', ''),
                'party': person.get('party', ''),
                'photo': person.get('photo_url', ''),
                'portfolio': '',  # Sera rempli depuis person_ministries
                'description': person.get('description', ''),
                'superiorId': person.get('superior_id'),
                'ministries': [],
                'delegates': [],
                'biography': [],
                'collaborators': []
            }
        elif role == 'collaborator':
            # C'est un collaborateur - sera ajouté aux ministres plus tard
            pass

    # Ajouter les ministries aux ministres
    for pm in person_ministries:
        person_id = pm['person_id']
        ministry_id = pm['ministry_id']

        if person_id in ministers and ministry_id in ministries:
            ministry = ministries[ministry_id]
            is_primary = pm['is_primary'].upper() == 'TRUE'

            ministers[person_id]['ministries'].append({
                'id': ministry_id,
                'name': ministry['name'],
                'shortName': ministry['short_name'],
                'color': ministry['color'],
                'isPrimary': is_primary,
                'roleLabel': pm.get('role_label', '')
            })

            # Définir le portfolio principal
            if is_primary:
                ministers[person_id]['portfolio'] = ministry['short_name']

    # Ajouter les biographies
    for career in careers:
        person_id = career['person_id']
        if person_id in ministers:
            ministers[person_id]['biography'].append({
                'title': career['title'],
                'organization': career['organisation'],
                'bioSection': career['bio_section'],
                'startDate': career.get('start_date'),
                'endDate': career.get('end_date'),
                'eventDate': career.get('event_date'),
                'eventText': career.get('event_text'),
                'ongoing': career.get('ongoing', 'FALSE').upper() == 'TRUE',
                'sortIndex': int(career.get('sort_index', 0))
            })

    # Ajouter les collaborateurs
    for person_id, person in persons.items():
        if person['role'] == 'collaborator':
            superior_id = person.get('superior_id')
            if superior_id and superior_id in ministers:
                ministers[superior_id]['collaborators'].append({
                    'id': person_id,
                    'name': person['full_name'],
                    'full_name': person['full_name'],
                    'superior_id': superior_id,
                    'job_title': person.get('job_title'),
                    'cabinet_role': person.get('cabinet_role'),
                    'cabinet_order': int(person.get('cabinet_order', 0)) if person.get('cabinet_order') else 0,
                    'cabinet_badge': person.get('cabinet_badge'),
                    'collab_grade': person.get('collab_grade'),
                    'pole_name': person.get('pole_name'),
                    'photo_url': person.get('photo_url'),
                    'description': person.get('description')
                })

    # Trier les biographies par sortIndex
    for minister in ministers.values():
        minister['biography'].sort(key=lambda x: x['sortIndex'])

    return list(ministers.values())

def validate_data(ministers):
    """Validations minimales."""
    ids = set()
    errors = []

    for minister in ministers:
        # IDs uniques
        if minister['id'] in ids:
            errors.append(f"ID dupliqué: {minister['id']}")
        ids.add(minister['id'])

        # Champs obligatoires
        if not minister['name']:
            errors.append(f"Ministre {minister['id']} sans nom")

    if errors:
        print("Erreurs de validation:")
        for error in errors:
            print(f"  - {error}")
        return False
    return True

def main():
    print("📖 Chargement des données CSV...")
    try:
        persons, careers, ministries, person_ministries = load_csv_data()
    except Exception as e:
        print(f"❌ Erreur lors du chargement des CSV: {e}")
        sys.exit(1)

    print("🏗️ Construction du JSON...")
    ministers = build_ministers_json(persons, careers, ministries, person_ministries)

    print("✅ Validation...")
    if not validate_data(ministers):
        sys.exit(1)

    json_path = Path(__file__).parent.parent / 'data' / 'ministers.json'
    print(f"💾 Sauvegarde vers {json_path}...")
    json_path.parent.mkdir(exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(ministers, f, ensure_ascii=False, indent=2)

    print(f"✅ Conversion terminée: {len(ministers)} ministres!")

if __name__ == "__main__":
    main()
#!/usr/bin/env bash
# ==============================================================================
# File: student_records.sh
# Project: Student Record Management System (Operating System Mini Project)
# Description: Menu-driven Bash shell script for managing student records
#              (Add, Search, Display, Modify, Delete) using CSV file storage.
# ==============================================================================

# Resolve the directory where this script lives so it runs independently
# from any working directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"
DATA_FILE="${DATA_DIR}/students.csv"
CSV_HEADER="RollNumber,Name,Department,Marks"

# ------------------------------------------------------------------------------
# Function: init_storage
# Purpose : Automatically creates the data/ directory and students.csv file
#           with a CSV header if they do not exist yet.
# ------------------------------------------------------------------------------
init_storage() {
  if [[ ! -d "$DATA_DIR" ]]; then
    mkdir -p "$DATA_DIR"
  fi

  if [[ ! -f "$DATA_FILE" ]]; then
    echo "$CSV_HEADER" > "$DATA_FILE"
  fi
}

# ------------------------------------------------------------------------------
# Function: trim
# Purpose : Trims leading and trailing whitespace from a string.
# ------------------------------------------------------------------------------
trim() {
  local var="$1"
  # Remove leading whitespace
  var="${var#"${var%%[![:space:]]*}"}"
  # Remove trailing whitespace
  var="${var%"${var##*[![:space:]]}"}"
  printf '%s' "$var"
}

# ------------------------------------------------------------------------------
# Function: to_lower
# Purpose : Converts a string to lowercase for case-insensitive roll matching.
# ------------------------------------------------------------------------------
to_lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

# ------------------------------------------------------------------------------
# Function: count_records
# Purpose : Counts the number of student records (excluding blank lines and header).
# ------------------------------------------------------------------------------
count_records() {
  init_storage
  local count=0
  local line
  local line_num=0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    ((line_num++))
    if [[ "$line_num" -eq 1 && "$line" == "$CSV_HEADER" ]]; then
      continue
    fi
    ((count++))
  done < "$DATA_FILE"

  echo "$count"
}

# ------------------------------------------------------------------------------
# Function: validate_roll_number
# Purpose : Validates that roll number is 1-32 chars using [A-Za-z0-9/_-].
# Returns : 0 if valid, 1 if invalid.
# ------------------------------------------------------------------------------
validate_roll_number() {
  local roll="$1"
  if [[ -z "$roll" ]]; then
    echo "Error: Roll number cannot be empty."
    return 1
  fi
  if [[ ${#roll} -gt 32 ]]; then
    echo "Error: Roll number must not exceed 32 characters."
    return 1
  fi
  if [[ ! "$roll" =~ ^[A-Za-z0-9/_-]+$ ]]; then
    echo "Error: Roll number may only contain letters, numbers, '-', '_', and '/'."
    return 1
  fi
  return 0
}

# ------------------------------------------------------------------------------
# Function: validate_text_field
# Purpose : Validates Name or Department (non-empty, length bounds, no commas).
# Args    : $1=value, $2=field_label, $3=min_len, $4=max_len
# ------------------------------------------------------------------------------
validate_text_field() {
  local val="$1"
  local label="$2"
  local min_len="$3"
  local max_len="$4"

  if [[ -z "$val" ]]; then
    echo "Error: $label cannot be empty."
    return 1
  fi
  if [[ ${#val} -lt $min_len || ${#val} -gt $max_len ]]; then
    echo "Error: $label must be between $min_len and $max_len characters."
    return 1
  fi
  # Commas would break CSV column alignment
  if [[ "$val" == *","* ]]; then
    echo "Error: $label cannot contain commas (,)."
    return 1
  fi
  return 0
}

# ------------------------------------------------------------------------------
# Function: validate_marks
# Purpose : Validates that marks are numeric (integer or decimal) in [0, 100].
# ------------------------------------------------------------------------------
validate_marks() {
  local marks="$1"
  if [[ -z "$marks" ]]; then
    echo "Error: Marks cannot be empty."
    return 1
  fi
  if [[ ! "$marks" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    echo "Error: Marks must be a valid non-negative number (e.g., 85 or 88.5)."
    return 1
  fi
  # Use awk to compare floating-point numbers reliably in [0, 100]
  if ! awk -v m="$marks" 'BEGIN { exit !(m >= 0 && m <= 100) }'; then
    echo "Error: Marks must be between 0 and 100."
    return 1
  fi
  return 0
}

# ------------------------------------------------------------------------------
# Function: find_record_by_roll
# Purpose : Searches data/students.csv for a matching roll number (case-insensitive).
# Output  : Prints the matched CSV line if found and returns 0; else returns 1.
# ------------------------------------------------------------------------------
find_record_by_roll() {
  local target_lower
  target_lower="$(to_lower "$1")"
  local line
  local line_num=0

  init_storage

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    ((line_num++))
    if [[ "$line_num" -eq 1 && "$line" == "$CSV_HEADER" ]]; then
      continue
    fi

    local r_roll r_name r_dept r_marks
    IFS=',' read -r r_roll r_name r_dept r_marks <<< "$line"
    if [[ "$(to_lower "$(trim "$r_roll")")" == "$target_lower" ]]; then
      echo "$line"
      return 0
    fi
  done < "$DATA_FILE"

  return 1
}

# ------------------------------------------------------------------------------
# Function: get_academic_standing
# Purpose : Computes academic standing label based on marks.
# ------------------------------------------------------------------------------
get_academic_standing() {
  local marks="$1"
  awk -v m="$marks" 'BEGIN {
    if (m >= 75) print "Distinction";
    else if (m >= 60) print "First Class";
    else if (m >= 40) print "Pass";
    else print "Needs Improvement";
  }'
}

# ------------------------------------------------------------------------------
# Function: pause_prompt
# Purpose : Pauses output after an operation so the user can review results
#           before returning to the menu.
# ------------------------------------------------------------------------------
pause_prompt() {
  echo ""
  read -r -p "Press Enter to continue..." _ || true
}

# ------------------------------------------------------------------------------
# Operation 1: Add Student Record
# ------------------------------------------------------------------------------
add_student() {
  init_storage
  echo ""
  echo "--------------------------------------------------"
  echo "  1. ADD STUDENT RECORD"
  echo "--------------------------------------------------"

  local roll name department marks

  # Read and validate unique Roll Number
  while true; do
    read -r -p "Enter Roll Number: " roll || return
    roll="$(trim "$roll")"
    if ! validate_roll_number "$roll"; then
      continue
    fi
    if find_record_by_roll "$roll" >/dev/null; then
      echo "Error: Roll number '$roll' already exists. Roll numbers must be unique."
      continue
    fi
    break
  done

  # Read and validate Student Name
  while true; do
    read -r -p "Enter Student Name: " name || return
    name="$(trim "$name")"
    if validate_text_field "$name" "Student Name" 2 80; then
      break
    fi
  done

  # Read and validate Department
  while true; do
    read -r -p "Enter Department (e.g., CSE, IT, ECE): " department || return
    department="$(trim "$department")"
    if validate_text_field "$department" "Department" 2 60; then
      break
    fi
  done

  # Read and validate Marks
  while true; do
    read -r -p "Enter Marks (0 - 100): " marks || return
    marks="$(trim "$marks")"
    if validate_marks "$marks"; then
      break
    fi
  done

  # Ensure file ends with newline and header exists if file was 0 bytes
  if [[ ! -s "$DATA_FILE" ]]; then
    echo "$CSV_HEADER" > "$DATA_FILE"
  fi

  # Append new record to CSV file
  echo "${roll},${name},${department},${marks}" >> "$DATA_FILE"
  echo ""
  echo "Success: Student record added to ${DATA_FILE}."
  echo "  Roll Number : $roll"
  echo "  Name        : $name"
  echo "  Department  : $department"
  echo "  Marks       : $marks"
}

# ------------------------------------------------------------------------------
# Operation 2: Search Student Record
# ------------------------------------------------------------------------------
search_student() {
  init_storage
  echo ""
  echo "--------------------------------------------------"
  echo "  2. SEARCH STUDENT RECORD"
  echo "--------------------------------------------------"

  local total
  total="$(count_records)"
  if [[ "$total" -eq 0 ]]; then
    echo "Notice: The student records file is currently empty."
    return
  fi

  local roll
  read -r -p "Enter Roll Number to search: " roll || return
  roll="$(trim "$roll")"

  if [[ -z "$roll" ]]; then
    echo "Error: Please enter a valid roll number."
    return
  fi

  local record
  if record="$(find_record_by_roll "$roll")"; then
    local r_roll r_name r_dept r_marks standing
    IFS=',' read -r r_roll r_name r_dept r_marks <<< "$record"
    standing="$(get_academic_standing "$r_marks")"

    echo ""
    echo "Student Record Found:"
    echo "  Roll Number : $r_roll"
    echo "  Name        : $r_name"
    echo "  Department  : $r_dept"
    echo "  Marks       : $r_marks / 100"
    echo "  Standing    : $standing"
  else
    echo ""
    echo "Not Found: No student record exists with roll number '$roll'."
  fi
}

# ------------------------------------------------------------------------------
# Operation 3: Display All Student Records
# ------------------------------------------------------------------------------
display_all_students() {
  init_storage
  echo ""
  echo "--------------------------------------------------------------------------"
  echo "  3. ALL STUDENT RECORDS"
  echo "--------------------------------------------------------------------------"

  local total
  total="$(count_records)"

  if [[ "$total" -eq 0 ]]; then
    echo "Notice: No student records found. File (${DATA_FILE}) is empty."
    return
  fi

  printf "%-16s %-26s %-20s %-8s %-18s\n" "ROLL NUMBER" "STUDENT NAME" "DEPARTMENT" "MARKS" "STANDING"
  echo "------------------------------------------------------------------------------------------"

  local line
  local line_num=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    ((line_num++))
    if [[ "$line_num" -eq 1 && "$line" == "$CSV_HEADER" ]]; then
      continue
    fi

    local r_roll r_name r_dept r_marks standing
    IFS=',' read -r r_roll r_name r_dept r_marks <<< "$line"
    standing="$(get_academic_standing "$r_marks")"

    printf "%-16s %-26s %-20s %-8s %-18s\n" \
      "${r_roll:0:15}" \
      "${r_name:0:25}" \
      "${r_dept:0:19}" \
      "$r_marks" \
      "$standing"
  done < "$DATA_FILE"

  echo "------------------------------------------------------------------------------------------"
  echo "Total Student Records: $total"
}

# ------------------------------------------------------------------------------
# Operation 4: Modify Student Record
# ------------------------------------------------------------------------------
modify_student() {
  init_storage
  echo ""
  echo "--------------------------------------------------"
  echo "  4. MODIFY STUDENT RECORD"
  echo "--------------------------------------------------"

  local total
  total="$(count_records)"
  if [[ "$total" -eq 0 ]]; then
    echo "Notice: No student records available to modify. File is empty."
    return
  fi

  local roll
  read -r -p "Enter Roll Number of student to modify: " roll || return
  roll="$(trim "$roll")"

  if [[ -z "$roll" ]]; then
    echo "Error: Roll number cannot be empty."
    return
  fi

  local existing
  if ! existing="$(find_record_by_roll "$roll")"; then
    echo "Not Found: No student record found with roll number '$roll'."
    return
  fi

  local old_roll old_name old_dept old_marks
  IFS=',' read -r old_roll old_name old_dept old_marks <<< "$existing"

  echo ""
  echo "Current Record:"
  echo "  Roll Number : $old_roll (Primary Key - Unchanged)"
  echo "  Name        : $old_name"
  echo "  Department  : $old_dept"
  echo "  Marks       : $old_marks"
  echo ""
  echo "Enter new values (press Enter to keep current value):"

  local new_name new_dept new_marks

  # Update Name
  while true; do
    read -r -p "New Name [$old_name]: " new_name || return
    new_name="$(trim "$new_name")"
    if [[ -z "$new_name" ]]; then
      new_name="$old_name"
      break
    fi
    if validate_text_field "$new_name" "Student Name" 2 80; then
      break
    fi
  done

  # Update Department
  while true; do
    read -r -p "New Department [$old_dept]: " new_dept || return
    new_dept="$(trim "$new_dept")"
    if [[ -z "$new_dept" ]]; then
      new_dept="$old_dept"
      break
    fi
    if validate_text_field "$new_dept" "Department" 2 60; then
      break
    fi
  done

  # Update Marks
  while true; do
    read -r -p "New Marks [$old_marks]: " new_marks || return
    new_marks="$(trim "$new_marks")"
    if [[ -z "$new_marks" ]]; then
      new_marks="$old_marks"
      break
    fi
    if validate_marks "$new_marks"; then
      break
    fi
  done

  # Write updated records to a safe temporary file and replace DATA_FILE
  local temp_file
  temp_file="$(mktemp "${DATA_DIR}/students.csv.tmp.XXXXXX")"
  local target_lower
  target_lower="$(to_lower "$old_roll")"

  echo "$CSV_HEADER" > "$temp_file"

  local line
  local line_num=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    ((line_num++))
    if [[ "$line_num" -eq 1 && "$line" == "$CSV_HEADER" ]]; then
      continue
    fi

    local r_roll r_name r_dept r_marks
    IFS=',' read -r r_roll r_name r_dept r_marks <<< "$line"
    if [[ "$(to_lower "$(trim "$r_roll")")" == "$target_lower" ]]; then
      echo "${old_roll},${new_name},${new_dept},${new_marks}" >> "$temp_file"
    else
      echo "$line" >> "$temp_file"
    fi
  done < "$DATA_FILE"

  mv "$temp_file" "$DATA_FILE"

  echo ""
  echo "Success: Record for Roll Number '$old_roll' updated."
  echo "  Name       : $new_name"
  echo "  Department : $new_dept"
  echo "  Marks      : $new_marks"
}

# ------------------------------------------------------------------------------
# Operation 5: Delete Student Record
# ------------------------------------------------------------------------------
delete_student() {
  init_storage
  echo ""
  echo "--------------------------------------------------"
  echo "  5. DELETE STUDENT RECORD"
  echo "--------------------------------------------------"

  local total
  total="$(count_records)"
  if [[ "$total" -eq 0 ]]; then
    echo "Notice: No student records available to delete. File is empty."
    return
  fi

  local roll
  read -r -p "Enter Roll Number of student to delete: " roll || return
  roll="$(trim "$roll")"

  if [[ -z "$roll" ]]; then
    echo "Error: Roll number cannot be empty."
    return
  fi

  local existing
  if ! existing="$(find_record_by_roll "$roll")"; then
    echo "Not Found: No student record found with roll number '$roll'."
    return
  fi

  local r_roll r_name r_dept r_marks
  IFS=',' read -r r_roll r_name r_dept r_marks <<< "$existing"

  echo ""
  echo "Record Selected for Deletion:"
  echo "  Roll Number : $r_roll"
  echo "  Name        : $r_name"
  echo "  Department  : $r_dept"
  echo "  Marks       : $r_marks"
  echo ""

  local confirm
  read -r -p "Are you sure you want to delete this record? (y/n): " confirm || return
  confirm="$(to_lower "$(trim "$confirm")")"

  if [[ "$confirm" != "y" && "$confirm" != "yes" ]]; then
    echo "Cancelled: Student record was not deleted."
    return
  fi

  # Rewrite CSV file without the deleted roll number using temp file
  local temp_file
  temp_file="$(mktemp "${DATA_DIR}/students.csv.tmp.XXXXXX")"
  local target_lower
  target_lower="$(to_lower "$r_roll")"

  echo "$CSV_HEADER" > "$temp_file"

  local line
  local line_num=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" ]] && continue
    ((line_num++))
    if [[ "$line_num" -eq 1 && "$line" == "$CSV_HEADER" ]]; then
      continue
    fi

    local c_roll c_name c_dept c_marks
    IFS=',' read -r c_roll c_name c_dept c_marks <<< "$line"
    if [[ "$(to_lower "$(trim "$c_roll")")" != "$target_lower" ]]; then
      echo "$line" >> "$temp_file"
    fi
  done < "$DATA_FILE"

  mv "$temp_file" "$DATA_FILE"
  echo ""
  echo "Success: Student record '$r_name' (Roll No: $r_roll) deleted from ${DATA_FILE}."
}

# ------------------------------------------------------------------------------
# Function: display_menu
# Purpose : Prints the main interactive shell menu.
# ------------------------------------------------------------------------------
display_menu() {
  local current_count
  current_count="$(count_records)"
  echo ""
  echo "=================================================="
  echo "  STUDENT RECORD MANAGEMENT SYSTEM (BASH SHELL)"
  echo "  Operating System Mini Project"
  echo "=================================================="
  echo "  Storage File : data/students.csv (${current_count} records)"
  echo "--------------------------------------------------"
  echo "  1. Add Student Record"
  echo "  2. Search Student Record"
  echo "  3. Display All Student Records"
  echo "  4. Modify Student Record"
  echo "  5. Delete Student Record"
  echo "  6. Exit"
  echo "=================================================="
}

# ------------------------------------------------------------------------------
# Main Program Loop
# ------------------------------------------------------------------------------
main() {
  init_storage

  while true; do
    display_menu
    local choice
    if ! read -r -p "Enter your choice [1-6]: " choice; then
      echo ""
      echo "Exiting Student Record Management System. Goodbye!"
      break
    fi

    choice="$(trim "$choice")"

    case "$choice" in
      1)
        add_student
        pause_prompt
        ;;
      2)
        search_student
        pause_prompt
        ;;
      3)
        display_all_students
        pause_prompt
        ;;
      4)
        modify_student
        pause_prompt
        ;;
      5)
        delete_student
        pause_prompt
        ;;
      6)
        echo ""
        echo "Exiting Student Record Management System. Goodbye!"
        exit 0
        ;;
      *)
        echo ""
        echo "Invalid choice: '$choice'. Please enter a number between 1 and 6."
        pause_prompt
        ;;
    esac
  done
}

# Start the menu-driven shell application
main

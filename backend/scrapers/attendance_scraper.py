import requests
from bs4 import BeautifulSoup

def get_attendance(session, user_rollno):
    """
    Fetches attendance data from eCampus for a given session
    :param session: Active logged-in session
    :param user_rollno: Roll number of the user
    :return: Dictionary containing attendance data or error
    """
    try:
        # Fetch attendance page
        response = session.get("https://ecampus.psgtech.ac.in/StudZone/Attendance/StudentPercentage", verify=False)
        attendance_soup = BeautifulSoup(response.content, "html.parser")
        
        # Check if we're redirected to login page (indicates session expired or login failed)
        if "login" in response.url.lower() or attendance_soup.find("form", {"class": "form__content"}):
            return {"error": "Session expired or login failed"}
        
        # Extract the attendance table
        attendance_table = attendance_soup.find('table', id="example")
        if not attendance_table:
            return {"error": "Attendance table not found"}
            
        if len(attendance_table.find_all('td')) == 0:
            return {"error": "No data found in the attendance table"}
        
        # Parse the table
        rows = attendance_table.find_all('tr')
        
        if len(rows) < 2:
            return {"error": "Insufficient attendance data"}
        
        # Get headers
        header_row = rows[0]
        headers = [th.text.strip() for th in header_row.find_all(['th', 'td'])]
        
        # Parse attendance data
        attendance_data = []
        for row in rows[1:]:
            cells = row.find_all(['th', 'td'])
            
            if len(cells) < 2:
                continue
            
            row_data = {}
            for idx, cell in enumerate(cells):
                if idx < len(headers):
                    row_data[headers[idx]] = cell.text.strip()
            
            # Calculate bunk count
            if 'Total hr' in row_data and 'Total Present' in row_data:
                try:
                    total_hours = int(row_data['Total hr'])
                    present_hours = int(row_data['Total Present'])
                    
                    # Calculate maximum classes that can be bunked while maintaining 85% attendance
                    max_total_for_85_percent = present_hours / 0.85
                    bunk_count = int(max_total_for_85_percent - total_hours)
                    
                    # If already below 85%, bunk count is 0
                    current_percentage = (present_hours / total_hours) * 100 if total_hours > 0 else 0
                    if current_percentage < 85:
                        bunk_count = 0
                    
                    row_data['Bunk Count (85%)'] = max(0, bunk_count)
                except (ValueError, ZeroDivisionError):
                    row_data['Bunk Count (85%)'] = 0
            
            if row_data:
                attendance_data.append(row_data)
        
        return {
            "success": True,
            "attendance": attendance_data,
            "rollNo": user_rollno
        }
        
    except requests.RequestException as e:
        return {"error": f"Network error: {str(e)}"}
    except Exception as e:
        return {"error": f"Error processing attendance data: {str(e)}"}

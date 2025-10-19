from bs4 import BeautifulSoup

def get_ca_marks(session, user_rollno):
    """
    Fetches CA marks from eCampus for a given session
    :param session: Active logged-in session
    :param user_rollno: Roll number of the user
    :return: Dictionary containing marks data or error
    """
    try:
        response = session.get("https://ecampus.psgtech.ac.in/StudZone/ContinuousAssessment/CAMarksView", verify=False)
        ca_marks_soup = BeautifulSoup(response.content, "html.parser")

        # Check if we're redirected to login page (indicates session expired or login failed)
        if "login" in response.url.lower() or ca_marks_soup.find("form", {"class": "form__content"}):
            return {"error": "Session expired or login failed"}

        # Retrieve all tables with the specified class
        marks_tables = ca_marks_soup.find_all('table', class_="table table-bordered table-striped")

        if not marks_tables:
            return {"error": "No marks data found"}

        all_marks = []

        # Process each table
        for table in marks_tables:
            rows = table.find_all('tr')
            
            if len(rows) < 2:
                continue
            
            # Get header row
            header_row = rows[0]
            headers = [th.text.strip() for th in header_row.find_all(['th', 'td'])]
            
            # Process data rows
            for row in rows[1:]:
                cells = row.find_all(['th', 'td'])
                
                if len(cells) < 2:
                    continue
                
                row_data = {}
                for idx, cell in enumerate(cells):
                    if idx < len(headers):
                        row_data[headers[idx]] = cell.text.strip()
                
                if row_data:
                    all_marks.append(row_data)

        return {
            "success": True,
            "marks": all_marks,
            "rollNo": user_rollno
        }

    except Exception as e:
        return {"error": f"Error fetching marks: {str(e)}"}

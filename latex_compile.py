import requests

# Compiles tex at tex.mendelu.cz. If pdf is produced, displays pdf. Shows logs otherwise. 
# (Yes, I know this is sketchy.)
def to_pdf(doc):
    payload = {
        'pole': doc,
        'pdf': 'PDF',
        'preklad': 'latex',
        'pruchod': '1',
        '.cgifields': 'komprim'
    }
    headers = {
        'Host': 'tex.mendelu.cz',
        'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:29.0) Gecko/20100101 Firefox/29.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Referer': 'http://tex.mendelu.cz/en/',
        'Connection': 'keep-alive',
    }

    r = requests.post('http://tex.mendelu.cz/en/', data=payload, headers=headers)
    success = (r.headers['content-type'] == 'application/pdf; charset=ISO-8859-1')
    if not success:
        r = requests.get('http://tex.mendelu.cz/tmp/default_en.log')
    return success, r.content


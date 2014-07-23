""" Compiles LaTeX at tex.mendelu.cz. """

import requests

def to_pdf(doc):
    """ Sends post respuest to tex.mendelu.cz with TeX file.
        If pdf is produced, displays pdf. Shows logs otherwise. 
        (Yes, I know this is sketchy.) """
    url = 'http://tex.mendelu.cz/en/'
    data = {
        'pole': doc,
        'pdf': 'PDF',
        'preklad': 'latex',
        'pruchod': '2',
        '.cgifields': 'komprim'
    }
    headers = {
        'Host': 'tex.mendelu.cz',
        'Connection': 'keep-alive',
    }

    resp = requests.post(url, data=data, headers=headers)
    success = ('application/pdf' in resp.headers['content-type'])
    if not success:
        resp = requests.get('http://tex.mendelu.cz/tmp/default_en.log')
    return success, resp.headers['content-type'], resp.content


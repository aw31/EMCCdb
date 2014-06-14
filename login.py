import urllib2
import requests
from ntlm import HTTPNtlmAuthHandler
from HTMLParser import HTMLParser

# From https://github.com/OnlineHarkness/PEAauth

class FormParser(HTMLParser):
    def __init__(self):
        HTMLParser.__init__(self)
        self._dict = dict()

    def handle_starttag(self, tag, attrs):
        if tag == 'input':
            el = dict(attrs)
            if 'value' in el:
                self._dict[el['name']] = el['value']
            elif 'Username' in el['name'] or 'Password' in el['name']:
                self._dict[el['name']] = ''
        elif tag == 'form':
            self.url = 'https://fs.exeter.edu' + dict(attrs)['action']

# returns True if successful, False otherwise
def login(username, password):
    r = requests.get('https://www.outlook.com/owa/exeter.edu')
    url = r.url

    if 'integrated' in url:
        req = urllib2.Request(url)
        password_manager = urllib2.HTTPPasswordMgrWithDefaultRealm()
        password_manager.add_password(None, url, username, password)
        auth_manager = HTTPNtlmAuthHandler.HTTPNtlmAuthHandler(password_manager)
        opener = urllib2.build_opener(auth_manager)
        urllib2.install_opener(opener)
        handler = urllib2.urlopen(req)
        return handler.getcode() == 200
    else:
        parser = FormParser()
        parser.feed(r.text)
        parser.close()
        payload = parser._dict
        payload[u'ctl00$ContentPlaceHolder1$UsernameTextBox'] = unicode(username)
        payload[u'ctl00$ContentPlaceHolder1$PasswordTextBox'] = unicode(password)
        p = requests.post(parser.url, data=payload)
        return 'Working' in p.text


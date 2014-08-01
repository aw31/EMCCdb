""" Authentication for GAE. """

import webapp2
import login
import json
from urlparse import urlsplit, parse_qs

from webapp2_extras import sessions
from webapp2_extras import auth
from google.appengine.ext.webapp import template

# From https://github.com/OnlineHarkness/app/tree/master/handlers .

class BaseHandler(webapp2.RequestHandler):
    """ RequestHandler that supports user authentication. """
    @webapp2.cached_property
    def auth(self):
        return auth.get_auth()

    def dispatch(self):
        """ Get a session store for this request. """
        self.session_store = sessions.get_store(request=self.request)

        try:
            # Dispatch the request.
            webapp2.RequestHandler.dispatch(self)
        finally:
            # Save all sessions.
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        """ Returns a session using the default cookie key. """
        return self.session_store.get_session()

    def user_info(self):
        """ Returns user info for current session. """
        return self.auth.get_user_by_session()

class LoginHandler(BaseHandler):
    """ Handler for logging in. """
    def get(self):
        """ Displays login page. """
        if self.request.get('url'):
            self.error(401)
        self.response.out.write(template.render('templates/login.html', {}))

    def post(self):
        """ Logs in user. """
        username = self.request.get('username')
        password = self.request.get('password')

        success = login.login(username, password)
        
        _dict = {
            'user_id': username
        }

        if success:
            self.auth.set_session(_dict, remember=True)
            self.response.headers['Content-Type'] = 'application/json'
            self.response.write(json.dumps({
                'success': True
            }))
        else:
            self.response.headers['Content-Type'] = 'application/json'
            self.response.write(json.dumps({
                'success': False
            }))

        # We redirect if argument is present in url.
        url = urlsplit(self.request.url)
        query = parse_qs(url[3])
        if 'url' in query:
            redirect = query['url'][0]
        else:
            redirect = '/'
        self.redirect(redirect)

class LogoutHandler(BaseHandler):
    """ Handler for logging out. """
    def get(self):
        """ Redirects to login. """
        self.auth.unset_session()
        self.redirect('/login')

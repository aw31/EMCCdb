import webapp2
import login
import os
import json

from webapp2_extras import sessions
from webapp2_extras import auth
from google.appengine.ext.webapp import template

# From https://github.com/OnlineHarkness/app/tree/master/handlers

class BaseHandler(webapp2.RequestHandler):
    @webapp2.cached_property
    def auth(self):
        return auth.get_auth()

    def dispatch(self):
        # Get a session store for this request.
        self.session_store = sessions.get_store(request=self.request)

        try:
            # Dispatch the request.
            webapp2.RequestHandler.dispatch(self)
        finally:
            # Save all sessions.
            self.session_store.save_sessions(self.response)

    @webapp2.cached_property
    def session(self):
        # Returns a session using the default cookie key.
        return self.session_store.get_session()

    def user_info(self):
        return self.auth.get_user_by_session()

class LoginHandler(BaseHandler):
    def get(self):
        self.response.out.write(template.render('templates/login.html', {}))

    def post(self):
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

        self.redirect('/')

class LogoutHandler(BaseHandler):
    def get(self):
        self.auth.unset_session()
        self.redirect('/')

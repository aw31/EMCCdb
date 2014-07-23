""" Appengine configuration. """

def webapp_add_wsgi_middleware(app):
    """ Enables appstats. """
    from google.appengine.ext.appstats import recording
    app = recording.appstats_wsgi_middleware(app)
    return app

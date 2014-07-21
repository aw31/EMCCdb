def webapp_add_wsgi_middleware(app):
  from google.appengine.ext.appstats import recording
  # Enables appstats. 
  app = recording.appstats_wsgi_middleware(app)
  return app

import webapp2
import cgi
import os
import json
from datetime import datetime

from google.appengine.api import memcache
from google.appengine.ext import ndb
from google.appengine.ext.webapp import template

import auth
import latex

def user_required(handler):
    # Decorator that checks if there's a user associated with the current session.
    # Will also fail if there's no session present.
    def check_login(self, *args, **kwargs):
        auth = self.auth
        if not auth.get_user_by_session():
            self.redirect('/login', abort=True)
        else:
            return handler(self, *args, **kwargs)

    return check_login

PROBLEM_COMMITTEE_ONLY = "Sorry, only problem commitee members can view submitted problems."

def problem_committee(user_id):
    # Checks if user of current session is in problem comittee. 
    problem_committee = ['awei', 'kwei', 'asun1', 'yyao', 'zsong', 'cqian', 'jhlin']
    return user_id in problem_committee

class Problem(ndb.Model):
    problem = ndb.StringProperty(indexed=False)
    answer = ndb.StringProperty(indexed=False)
    date = ndb.DateTimeProperty(auto_now_add=True)
    tags = ndb.StringProperty(indexed=False, repeated=True)
    used = ndb.BooleanProperty(indexed=True, default=False) # Set to True if deleted. 
    author = ndb.StringProperty()
    difficulty = ndb.StringProperty()
    comments = ndb.TextProperty()

class Change(ndb.Model):
    problem_id = ndb.IntegerProperty(indexed=False)
    user_id = ndb.StringProperty()
    date = ndb.DateTimeProperty(auto_now_add=True, indexed=True)

# Lists submitted problems, only accessible to problem committee. 
# If nonempty 'deleted' parameter is provided, then we return list of soft-deleted problems. 
class ViewHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        used = (self.request.get('deleted') != '')
        problems = Problem.query(Problem.used == used).order(Problem.date)
        context = {
            'problems': problems,
            'problem_committee': problem_committee(user_id),
            'date': str(datetime.now())
        }
        self.response.out.write(template.render('templates/view.html', context))

# Edits submitted problems, only accessible to problem committee.
class EditHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        try:
            problem_id = int(self.request.get('problem_id'))
            index = int(self.request.get('index'))
        except:
            self.abort(404)
        problem = Problem.get_by_id(problem_id, parent=ndb.Key('Problems', 'default'))
        if not problem:
            self.abort(404)
        context = {
            'problem': problem, 
            'index': index, 
            'problem_committee': problem_committee(user_id)
        }
        self.response.out.write(template.render('templates/edit.html', context))

    @user_required
    def post(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            problem_id = int(self.request.get('problem_id'))
            problem = Problem.get_by_id(problem_id, parent=ndb.Key('Problems', 'default'))
            if not problem:
                self.abort(404)
            problem.problem = self.request.get('problem')
            problem.answer = self.request.get('answer')
            problem.tags = self.request.get('tags').lower().split()
            problem.difficulty = self.request.get('difficulty')
            problem.comments = self.request.get('comments')
            problem.put()

            # Log this edit by creating a new Change entity. 
            change = Change(parent=ndb.Key('Changes', 'default'))
            change.problem_id = problem_id
            change.user_id = user_id
            change.put()

            # Set last_write to now in memcache, so we know we need to update. 
            memcache.set('last_write', str(datetime.now()))
        else:
            self.redirect('/')

DATE_FORMAT = '%Y-%m-%d %H:%M:%S.%f'

# Returns list of changes made since 'date' and current time. 
# Accessible only to problem committee. 
class ChangeHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            # Parameter date contains the last time we checked for changes. 
            try: 
                last_update = datetime.strptime(self.request.get('date'), DATE_FORMAT)
            except: 
                self.abort(404)

            self.response.headers['Content-Type'] = 'application/json'

            # We store the time of the last edit operation in memcache. 
            # This way, we don't need to read from datastore every time we poll. 
            done = False
            last_write = memcache.get('last_write')
            if last_write is not None:
                last_write = datetime.strptime(last_write, DATE_FORMAT)
                if last_update > last_write:
                    date = str(datetime.now())
                    self.response.out.write(json.dumps({'ids': [], 'date': date}))
                    done = True

            # If there were edits, return list of changes. 
            if not done:
                changes = Change.query(Change.date >= last_update)
                ids = set()
                for change in changes:
                    ids.add(change.problem_id)
                ids = list(ids)
                if not ids:
                    ids = []
                date = str(datetime.now())
                self.response.out.write(json.dumps({'ids': ids, 'date': date}))
        else:
            self.response.out.write(PROBLEM_COMMITTEE_ONLY)

# Returns data about queried problem. 
# Accessible only to problem committee. 
class ProblemHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            try:
                problem_id = int(self.request.get('problem_id'))
            except:
                self.abort(404)
            problem = Problem.get_by_id(problem_id, parent=ndb.Key('Problems', 'default'))
            if not problem:
                self.abort(404)
            self.response.headers['Content-Type'] = 'application/json'
            resp = {
                'id': problem.key.id(),
                'problem': problem.problem, 
                'answer': problem.answer, 
                'difficulty': problem.difficulty,
                'tags': problem.tags, 
                'author': problem.author, 
                'comments': problem.comments
            }
            self.response.out.write(json.dumps(resp))
        else:
            self.response.out.write(PROBLEM_COMMITTEE_ONLY)

EXPORT_HEADER = """\
\\documentclass[12pt]{article}

\\usepackage{amsmath,amssymb,amsthm}
\\usepackage[pdftex]{graphicx}
\\usepackage{asymptote}
\\usepackage{listings}
\\usepackage{hyperref}
\\usepackage{xifthen}
\\usepackage{color}

\\newcounter{c}
\\newenvironment{problem}[1][]
{
  \\stepcounter{c}
  \\begin{itemize}
  \\item [\\thec.]
  \\ifthenelse{\\isempty{#1}}
  {\\newcommand{\\foot}{}}
  {\\newcommand{\\foot}{\\\\ \\textbf{Answer:} #1}}
}
{
  \\foot
  \\end{itemize}
  %\\vspace{1em}
}

\\begin{document}

\\title{EMCC 2015: Problem Bank}
\\maketitle

"""

# Creates tex from problem data. 
def export(author=False):
    doc = EXPORT_HEADER
    if author:
        problems = Problem.query(Problem.used == False).order(Problem.author)
        current_author = ''
        for problem in problems:
            if problem.author != current_author:
                doc += '\\section{' + problem.author + '}\n\n'
                current_author = problem.author
            doc += '\\begin{problem}[' + problem.answer.rstrip('\n') + ']\n'
            doc += '  ' + problem.problem + '\n'
            doc += '\\end{problem}\n\n'
        doc += '\\end{document}\n'
    else:
        problems = Problem.query(Problem.used == False).order(Problem.date)
        for problem in problems:
            #doc += '\\begin{problem}[' + problem.answer.rstrip('\n') + ']\n'
            doc += '\\begin{problem}\n'
            doc += '  ' + problem.problem + ' (\emph{' + problem.author + '})\n'
            doc += '\\end{problem}\n\n'
        doc += '\\end{document}\n'
    return doc

# Exports all submitted problems as TeX, only accessible to problem committee. 
class ExportHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            doc = export()
            self.response.headers['Content-Type'] = 'text/plain'
            self.response.out.write(doc)
        else:
            self.response.headers['Content-Type'] = 'text/plain'
            self.response.out.write(PROBLEM_COMMITTEE_ONLY)

# Exports all submitted problems as a pdf, only accessible to problem committee. 
class PdfHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            doc = export()
            success, out = latex.to_pdf(doc)
            if success:
                self.response.headers['Content-Type'] = 'application/pdf; charset=ISO-8859-1'
                self.response.out.write(out)
            else:
                self.response.headers['Content-Type'] = 'text/plain'
                self.response.out.write("Something's wrong! Here are the logs:\n\n")
                self.response.out.write(out)
        else:
            self.response.headers['Content-Type'] = 'text/plain'
            self.response.out.write(PROBLEM_COMMITTEE_ONLY)

# Soft deletes problem by setting 'used' to True. 
class DeleteHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            try:
                problem_id = int(self.request.get('problem_id'))
            except:
                self.abort(404)
            problem = Problem.get_by_id(problem_id, parent=ndb.Key('Problems', 'default'))
            if not problem:
                self.abort(404)
            problem.used = True
            problem.put()
        self.redirect('/')

# Main page (and problem submission page). 
class MainPage(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        context = {
            'problem_committee': problem_committee(user_id),
        }
        self.response.out.write(template.render('templates/index.html', context))

    @user_required
    def post(self):
        problem = Problem(parent=ndb.Key('Problems', 'default'))
        problem.problem = self.request.get('problem')
        problem.answer = self.request.get('answer')
        problem.tags = self.request.get('tags').lower().split()
        problem.difficulty = self.request.get('difficulty')
        problem.author = self.user_info()['user_id']
        problem.comments = ""
        problem.put()
        user_id = self.user_info()['user_id']
        context = {
            'problem_committee': problem_committee(user_id),
        }

config = {}
config['webapp2_extras.sessions'] = {
        'secret_key': 'hella_secret',
}

# Handler for 404 errors. 
def handle_404(request, response, exception):
    response.out.write(template.render('templates/404.html', {}))
    response.set_status(404)

application = webapp2.WSGIApplication(
    [
        ('/', MainPage),
        ('/view', ViewHandler),
        ('/edit', EditHandler),
        ('/delete', DeleteHandler), 
        ('/get_changes', ChangeHandler),
        ('/get_problem', ProblemHandler),
        ('/export', ExportHandler),
        ('/pdf', PdfHandler),
        ('/login', auth.LoginHandler),
        ('/logout', auth.LogoutHandler),
    ], 
    config=config,
    debug=True
)
application.error_handlers[404] = handle_404

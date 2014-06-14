import webapp2
import cgi
import os
import latex_compile

from google.appengine.ext import ndb
from google.appengine.ext.webapp import template

import auth

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

def problem_committee(user_id):
    # Checks if user of current session is in problem comittee. 
    problem_committee = ['awei', 'kwei', 'asun1', 'yyao', 'zsong', 'cqian', 'jhlin']
    return user_id in problem_committee

class Problem(ndb.Model):
    problem = ndb.StringProperty(indexed=False)
    answer = ndb.StringProperty(indexed=False)
    date = ndb.DateTimeProperty(auto_now_add=True)
    tags = ndb.StringProperty(indexed=False, repeated=True)
    used = ndb.BooleanProperty(default=False)
    author = ndb.StringProperty()
    difficulty = ndb.StringProperty()
    comments = ndb.TextProperty()

class SubmissionHandler(auth.BaseHandler):
    def post(self):
        problem = Problem(parent=ndb.Key('Problems', 'default'))
        problem.problem = self.request.get('problem')
        problem.answer = self.request.get('answer')
        problem.tags = self.request.get('tags').lower().split()
        problem.difficulty = self.request.get('difficulty')
        problem.author = self.user_info()['user_id']
        problem.comments = ""
        problem.put()

        self.redirect('/')

# Lists submitted problems, only accessible to problem committee. 
class ViewHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            problems = Problem.query().order(-Problem.date)
            self.response.out.write(template.render('templates/view.html', {'problems': problems, 'problem_committee': True}))
        else:
            self.response.out.write(template.render('templates/view.html', {'problem_committee': False}))

# Edits submitted problems, only accessible to problem committee.
class EditHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        try:
            problem_id = int(self.request.get('problem_id'))
        except:
            self.abort(404)
        if problem_committee(user_id):
            problem = Problem.get_by_id(problem_id, parent=ndb.Key('Problems', 'default'))
            self.response.out.write(template.render('templates/edit.html', {'problem': problem, 'problem_committee': True}))
        else:
            self.response.out.write(template.render('templates/edit.html', {'problem_committee': False}))

    @user_required
    def post(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            problem_id = int(self.request.get('problem_id'))
            problem = Problem.get_by_id(problem_id, parent=ndb.Key('Problems', 'default'))
            problem.problem = self.request.get('problem')
            problem.answer = self.request.get('answer')
            problem.tags = self.request.get('tags').lower().split()
            problem.difficulty = self.request.get('difficulty')
            problem.comments = self.request.get('comments')
            problem.put()

        self.redirect('/view')

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

# Creates tex from problem data
def export(author=False):
    doc = EXPORT_HEADER
    if author:
        problems = Problem.query().order(Problem.author)
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
        problems = Problem.query().order(Problem.date)
        for problem in problems:
            #doc += '\\begin{problem}[' + problem.answer.rstrip('\n') + ']\n'
            doc += '\\begin{problem}\n'
            doc += '  ' + problem.problem + ' (\emph{' + problem.author + '})\n'
            doc += '\\end{problem}\n\n'
        doc += '\\end{document}\n'
    return doc

# Exports all submitted problems as tex, only accessible to problem committee
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
            self.response.out.write("Sorry, only problem committee members can view submitted problems.")

# Exports all submitted problems as a pdf, only accessible to problem committee
class PdfHandler(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        if problem_committee(user_id):
            doc = export()
            success, out = latex_compile.to_pdf(doc)
            if success:
                self.response.headers['Content-Type'] = 'application/pdf; charset=ISO-8859-1'
                self.response.out.write(out)
            else:
                self.response.headers['Content-Type'] = 'text/plain'
                self.response.out.write("Something's wrong! Here are the logs:\n\n")
                self.response.out.write(out)
        else:
            self.response.headers['Content-Type'] = 'text/plain'
            self.response.out.write("Sorry, only problem committee members can view submitted problems.")

# Main page (contains problem submission)
class MainPage(auth.BaseHandler):
    @user_required
    def get(self):
        user_id = self.user_info()['user_id']
        self.response.out.write(template.render('templates/index.html', {'problem_committee': problem_committee(user_id)}))

config = {}
config['webapp2_extras.sessions'] = {
        'secret_key': 'hella_secret',
}

application = webapp2.WSGIApplication(
    [
        ('/', MainPage),
        ('/submit', SubmissionHandler),
        ('/view', ViewHandler),
        ('/edit', EditHandler),
        ('/export', ExportHandler),
        ('/pdf', PdfHandler),
        ('/login', auth.LoginHandler),
        ('/logout', auth.LogoutHandler),
    ], 
    config=config,
    debug=True,
)

""" EMCCdb application """

import webapp2
import ast
import json
from datetime import datetime

from google.appengine.api import memcache
from google.appengine.ext import ndb
from google.appengine.ext.webapp import template

import auth
import latex

def user_required(handler):
    """ Decorator that checks if current session has user.
    Will also fail if there's no session present. """
    def check_login(self, *args, **kwargs):
        """ Redirects user to login if not logged in. """
        if not self.user_info():
            self.redirect('/login', abort=True)
        else:
            return handler(self, *args, **kwargs)

    return check_login

PROBLEM_COMMITTEE = ['awei', 'kwei', 'asun1', 'yyao', 'zsong', 'cqian', \
                     'jhlin', 'zfeng']

def problem_committee_required(handler):
    """ Checks if user of current session is in problem committee. """
    def check_problem_committee(self, *args, **kwargs):
        """ Redirects user to problem_committee if not in problem committee. """
        user_id = self.user_info()['user_id']
        if not user_id in PROBLEM_COMMITTEE:
            self.redirect('/problem_committee', abort=True)
        else:
            return handler(self, *args, **kwargs)

    return check_problem_committee

class Problem(ndb.Model):
    """ Problem model. """
    problem = ndb.StringProperty(indexed=False)
    answer = ndb.StringProperty(indexed=False)
    date = ndb.DateTimeProperty(auto_now_add=True)
    tags = ndb.StringProperty(indexed=False, repeated=True)
    used = ndb.BooleanProperty(indexed=True, default=False) # True if deleted. 
    author = ndb.StringProperty()
    difficulty = ndb.StringProperty()
    comments = ndb.TextProperty()

class Change(ndb.Model):
    """ Change model, tracks modifications to Problems. """
    problem_id = ndb.IntegerProperty(indexed=False)
    user_id = ndb.StringProperty()
    date = ndb.DateTimeProperty(auto_now_add=True, indexed=True)

class Round(ndb.Model):
    """ Round model. """
    name = ndb.StringProperty(indexed=True)
    length = ndb.IntegerProperty()
    problems = ndb.IntegerProperty(repeated=True)
    weights = ndb.IntegerProperty(repeated=True) # Not implemented.
    last_update = ndb.DateTimeProperty(auto_now_add=True) # Not implemented.
    year = ndb.StringProperty()

class MainPage(auth.BaseHandler):
    """ Main page (and problem submission page). """
    @user_required
    def get(self):
        """ Returns problem submission form. """
        user_id = self.user_info()['user_id']
        context = {
            'not_problem_committee': user_id not in PROBLEM_COMMITTEE
        }
        output = template.render('templates/index.html', context)
        self.response.out.write(output)

    @user_required
    def post(self):
        """ Saves new problem. """
        problem = Problem(parent=ndb.Key('Problems', 'default'))
        problem.problem = self.request.get('problem')
        problem.answer = self.request.get('answer')
        problem.tags = self.request.get('tags').lower().split()
        problem.difficulty = self.request.get('difficulty')
        problem.author = self.user_info()['user_id']
        problem.comments = ''
        problem.put()

class ViewHandler(auth.BaseHandler):
    """ Handler for viewing submitted problems. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Returns list of submitted problems. 
            If nonempty 'deleted' parameter is provided,
            then we return list of soft-deleted problems. """
        used = (self.request.get('deleted') != '')
        problems = Problem.query(Problem.used == used). \
                           order(Problem.date). \
                           fetch(batch_size=300)
        context = {
            'problems': problems,
            'date': str(datetime.now())
        }
        output = template.render('templates/view.html', context)
        self.response.out.write(output)

class EditHandler(auth.BaseHandler):
    """ Edits submitted problems. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Paramater to get argument is (long) problem_id. """
        try:
            problem_id = int(self.request.get('problem_id'))
            index = self.request.get('index')
            round = self.request.get('round')
        except ValueError:
            self.abort(404)
        parent = ndb.Key('Problems', 'default')
        problem = Problem.get_by_id(problem_id, parent=parent)
        if not problem:
            self.abort(404)
        context = {
            'round': round, 
            'problem': problem, 
            'index': index, 
        }
        output = template.render('templates/edit.html', context)
        self.response.out.write(output)

    @user_required
    @problem_committee_required
    def post(self):
        """ Saves form to problem with ID problem_id. """
        problem_id = int(self.request.get('problem_id'))
        parent = ndb.Key('Problems', 'default')
        problem = Problem.get_by_id(problem_id, parent=parent)
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
        change.user_id = self.user_info()['user_id']
        change.put()

        # Set last_write to now in memcache, so we know we need to update. 
        memcache.set('last_write', str(datetime.now()))

class DeleteHandler(auth.BaseHandler):
    """ Handler for problem deletion. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Soft deletes problem by setting 'used' to True. """
        try:
            problem_id = int(self.request.get('problem_id'))
        except ValueError:
            self.abort(404)
        parent = ndb.Key('Problems', 'default')
        problem = Problem.get_by_id(problem_id, parent=parent)
        if not problem:
            self.abort(404)
        problem.used = True
        problem.put()
        self.redirect('/')

class ProblemHandler(auth.BaseHandler):
    """ Returns data about queried problem. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Accepts two types of queries:
            If index is empty, then return problem with long ID problem_id. 
            Otherwise, return problem with short ID (index) problem_id. 
            (Short ID / index of problem is # of problems that were added
            with date <= its date.) """
        try:
            problem_id = int(self.request.get('problem_id'))
            index = (self.request.get('index') != '')
        except ValueError:
            self.abort(404)
        if index:
            try:
                problem = Problem.query(Problem.used == False). \
                                  order(Problem.date). \
                                  fetch(limit=1, offset=problem_id - 1)[0]
            except IndexError:
                self.abort(404)
        else:
            parent = ndb.Key('Problems', 'default')
            problem = Problem.get_by_id(problem_id, parent=parent)
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

DATE_FORMAT = '%Y-%m-%d %H:%M:%S.%f'

class ChangeHandler(auth.BaseHandler):
    """ Returns list of changes made since 'date' and current time. 
        Accessible only to problem committee. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Parameter date contains the last time we checked for changes. """
        try: 
            last_update_str = self.request.get('date')
            last_update = datetime.strptime(last_update_str, DATE_FORMAT)
        except ValueError: 
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

class RoundCreateHandler(auth.BaseHandler):
    """ Handler for round creation. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Returns round creation form. """
        output = template.render('templates/add_round.html', {})
        self.response.out.write(output)

    @user_required
    @problem_committee_required
    def post(self):
        """ Saves new round. """
        round = Round(parent=ndb.Key('Rounds', 'default'))
        round.name = self.request.get('name')
        round.length = int(self.request.get('length'))
        round.problems = [1] * round.length
        round.weights = [1] * round.length
        round.year = self.request.get('year')
        round.put()

class RoundViewHandler(auth.BaseHandler):
    """ Handler for viewing created rounds. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Returns list of created rounds. """
        rounds = Round.query().order(Round.name)
        context = {
            'rounds': rounds,
        }
        output = template.render('templates/view_rounds.html', context)
        self.response.out.write(output)

class RoundEditHandler(auth.BaseHandler):
    """ Handler for editing rounds. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Returns contents of round for modification. """
        try:
            round_id = int(self.request.get('round_id'))
        except ValueError:
            self.abort(404)
        parent = ndb.Key('Rounds', 'default')
        round = Round.get_by_id(round_id, parent=parent)
        if not round:
            self.abort(404)

        problems = []
        for problem_id in round.problems:
            parent = ndb.Key('Problems', 'default')
            if problem_id == 1:
                problems.append(None)
            else:
                problem = Problem.get_by_id(problem_id, parent=parent)
                problems.append(problem)

        context = {
            'round': round,
            'problems': problems,
            'date': str(datetime.now())
        }
        output = template.render('templates/edit_round.html', context)
        self.response.out.write(output)

    @user_required
    @problem_committee_required
    def post(self):
        """ Sets the problems of round with ID round_id to problems. """
        try:
            round_id = int(self.request.get('round_id'))
            problems = map(int, ast.literal_eval(self.request.get('problems')))
        except (ValueError, SyntaxError):
            self.abort(404)
        parent = ndb.Key('Rounds', 'default')
        round = Round.get_by_id(round_id, parent=parent)
        if not round:
            self.abort(404)

        round.problems = problems
        round.put()
        if not round:
            self.abort(404)

class CompileHandler(auth.BaseHandler):
    """ Handler for compiling LaTeX. """
    @user_required
    @problem_committee_required
    def get(self):
        """ Compiles LaTeX in get request. """
        self.response.out.write('Sorry, this is currently broken.')
        return
        doc = self.request.get('tex')
        success, content_type, out = latex.to_pdf(doc)

        if not success:
            self.response.out.write("Something's wrong! Here are the logs:\n\n")
        self.response.headers['Content-Type'] = content_type
        self.response.out.write(out)

class ProblemCommitteeHandler(auth.BaseHandler):
    """ Handler for catching unauthorized accesses. """
    @user_required
    def get(self):
        """ Returns "Problem Committee only" page. """
        user_id = self.user_info()['user_id']
        context = {
            'not_problem_committee': user_id not in PROBLEM_COMMITTEE
        }
        output = template.render('templates/problem_committee.html', context)
        self.response.out.write(output)

def handle_404(request, response, exception):
    """ Handler for 404 errors. """
    output = template.render('templates/404.html', {})
    response.out.write(output)
    response.set_status(404)

config = {}
config['webapp2_extras.sessions'] = {
        'secret_key': 'hella_secret',
}

application = webapp2.WSGIApplication(
    [
        ('/', MainPage),
        ('/view', ViewHandler),
        ('/edit', EditHandler),
        ('/delete', DeleteHandler), 
        ('/get_changes', ChangeHandler),
        ('/get_problem', ProblemHandler),
        ('/add_round', RoundCreateHandler),
        ('/view_rounds', RoundViewHandler),
        ('/edit_round', RoundEditHandler),
        ('/compile', CompileHandler),
        ('/problem_committee', ProblemCommitteeHandler),
        ('/login', auth.LoginHandler),
        ('/logout', auth.LogoutHandler),
    ], 
    config=config,
    debug=True
)
application.error_handlers[404] = handle_404

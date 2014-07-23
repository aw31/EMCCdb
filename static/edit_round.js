'use strict';

function renumber(){
  // renumbers problems during dragging
  var i = 0, drag_i;
  $('#round-body tr').each(function(){
    if(!$(this).hasClass('dragged')){
      i++;
      $(this).find('.counter').first().html(i);
    }
    if($(this).hasClass('placeholder')){
      drag_i = i;
    }
  });
  $('#round-body tr').each(function(){
    if($(this).hasClass('dragged')){
      $(this).find('.counter').first().html(drag_i);
    }
  });
}

var delete_button = ' <button class="btn btn-xs btn-secondary delete">' +
                    '<span class="glyphicon glyphicon-remove"></span></button>' +
                    '<span>&zwnj;</span>';
var id_form = '<form class="add-form problem">' +
              '<input type="text" class="form-control" name="id" ' + 
              'placeholder="Problem ID"></input></form>';
var del_open = 'Deleted. <a href="javascript:void(0)" class="undo" id="';
var del_close = '">Undo?</a>';
var tag_div_open = '<div class="tags">&nbsp;';
var tag_div_close = '</div>';
var tag_open = '<span class="btn btn-xs tag">';
var tag_close = '</span>';

function getTeX(){
  // returns round -> TeX
  var output = template_open;
  $('.raw').each(function(){
    output += '\\item ' + $(this).html() + '\n';
  });
  output += template_close;
  return output;
}

function make_tag(tag){
  if(tag.length === 0) return tag_open + '?' + tag_close;
  return tag_open + tag + tag_close;
}

function undo(del_row, del_id){
  // undoes delete by adding problem with id del_id to row del_row
  $.get('get_problem?problem_id=' + del_id, function(r){
    var row = $('#round-body tr:nth-child(' + del_row + ')');
    row.find('.raw').html(r.problem);
    var div_open = '<div class="problem" id="' + del_id + '">';
    var div_close = delete_button + '</div>';
    var prob = div_open + latex_to_HTML(r.problem) + div_close;
    var tags = ''
    tags += make_tag(r.author);
    tags += make_tag(r.difficulty);
    for(var i = 0; i < r.tags.length; i++){
      tags += make_tag(r.tags[i]);
    }
    prob += tag_div_open + tags + tag_div_close;
    row.find('td:nth-child(2)').html(prob);
    $('body').addClass('changed');
    MathJax.Hub.Queue(
      ["Typeset", MathJax.Hub]
    );
  }).fail(function(){
    addStatus('Oops, the ID is invalid.', 'alert-danger');
  });
}

$(document).ready(function(){
  // add sortable to table
  $('#round').sortable({
    containerSelector: 'table',
    handle: '.grip-wrapper',
    itemPath: '> tbody',
    itemSelector: 'tr',
    placeholder: '<tr class="placeholder" />',
    afterMove: function(){
      renumber();
      $('body').addClass('changed');
    }
  });

  $('.problem').each(function(){
    // adds delete button to each problem
    if($(this).attr('id') != '1'){
      $(this).html(latex_to_HTML($(this).html()) + delete_button);
    }
  });

  $(document).on('mouseenter', '.problem', function(){
    // shows delete button on mouseenter
    $(this).find('button').show();
  });

  $(document).on('mouseleave', '.problem', function(){
    // hides delete button on mouseleave
    $(this).find('button').hide();
  });

  $(document).on('click', '.undo', function(){
    // calls undo, fades delete status
    var params = $(this).attr('id').split(' ');
    $(this).parent().delay(500).fadeOut('slow');
    undo(params[0], params[1]);
  });

  $(document).on('click', '.delete', function(){
    // deletes problem in same cell as delete button
    var div = $(this).parent();
    var row = div.parent().parent();
    var id = div.attr('id');
    var index = row.find('.counter').html();
    div.attr('id', '1');
    div.parent().html(id_form);
    row.find('.raw').html('');
    $('body').addClass('changed');
    addStatus(del_open + index + ' ' + id + del_close, 'alert-success', 5000);
  });

  $(document).on('click', '.prob-link', function(){
    // if problem is not empty, opens edit in new tab
    var row = $(this).parent().parent();
    var id = row.find('.problem').attr('id');
    var index = row.find('.counter').html();
    if(id != '1'){
      var url = 'edit?problem_id=' + id + '&index=' + index + '&round=' + round_name;
      window.open(url, '_blank');
    }
  });

  $(document).on('submit', '.add-form', function(e){
    // adds problem to round
    var id = $(this).find('input').val();
    var form = $(this);
    $.get('get_problem?problem_id=' + id + '&index=true', function(r){
      var row = form.parent().parent();
      row.find('.raw').html(r.problem);
      form.find('input').prop('disabled', false);
      form.find('input').val('');
      var div_open = '<div class="problem" id="' + r.id + '">';
      var div_close = delete_button + '</div>';
      var prob = div_open + latex_to_HTML(r.problem) + div_close;
      var tags = ''
      tags += make_tag(r.author);
      tags += make_tag(r.difficulty);
      for(var i = 0; i < r.tags.length; i++){
        tags += make_tag(r.tags[i]);
      }
      prob += tag_div_open + tags + tag_div_close;
      form.parent().html(prob);
      $('body').addClass('changed');
      MathJax.Hub.Queue(
        ["Typeset", MathJax.Hub]
      );
    }).fail(function(){
      var form = $('#' + form_id);
      form.find('input').prop('disabled', false);
      addStatus('Oops, the ID is invalid.', 'alert-danger');
    });
    $(this).find('input').prop('disabled', true);
    e.preventDefault();
  });

  $('#tex').click(function(){
    // opens round -> TeX in new tab
    var output = encodeURIComponent(getTeX());
    window.open('data:text/plain,' + output, '_blank');
  });

  $('#pdf').click(function(){
    // opens round -> pdf in new tab
    var output = encodeURIComponent(getTeX());
    //window.open('compile?tex=' + output, '_blank');
    window.open('compile?tex=broken', '_blank');
  });

  $('#save').click(function(){
    // saves round
    var problems = [];
    $('.problem').each(function(){
      problems.push($(this).attr('id'));
    });
    $.ajax({
      type: 'POST',
      url: '/edit_round',
      data: {
        problems: JSON.stringify(problems),
        round_id: round_id
      },
      success: function(){
        addStatus('Saved!', 'alert-success');
        $('body').removeClass('changed');
      },
      error: function(){
        addStatus('Oops, an error occurred.', 'alert-danger');
      }
    });
  });
});

$(window).on('beforeunload', function () {
  // if there are unsaved changes, prompt user
  if($('.changed').length > 0){
    return 'You have unsaved changes!';
  }
});

function update_problem(id){
  // update problem with given id
  if($('#' + id).length === 0) return;
  $.get('get_problem?problem_id=' + id, function (r) {
    $('#' + id).html(latex_to_HTML(r.problem) + delete_button);
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    $('#' + id).parent().find('.raw').html(r.problem);
  });
}

function update() {
  // gets and updates recently changed problems
  $.get('get_changes?date=' + last_update, function (r) {
    if(r.date){
      last_update = r.date;
    }
    var ids = r.ids;

    if(ids === 'undefined') return;
    for (var i = 0; i < ids.length; i++) {
      update_problem(ids[i]);
    }
  });
}

setInterval(update, 5000);

var template_open = "\\documentclass[12pt]{book}\n \
\\usepackage{amsmath, amssymb, amsthm}\n \
\\usepackage{versions}\n \
\\usepackage{graphicx}\n \
\\usepackage{hyperref}\n \
\\usepackage{epstopdf}\n \
\\usepackage{calc}\n \
\\theoremstyle{definition}\n \
\\newtheorem*{sol*}{Solution}\n \
\\newcommand{\\emccyear}[1]{\\newcommand{\\printyear}{#1}}\n \
\\newcommand{\\emccdate}[1]{\\newcommand{\\printdate}{#1}}\n \
\\newcommand{\\acknowledge}[2]{\\item{\\em{\\bf #1}} \\quad #2}\n \
\\newcommand{\\smallemcclogo}{\\begin{center} \\includegraphics{../include/emcclogo} \\end{center}}\n \
\\newcommand{\\bigemcclogo}{\\begin{center} \\includegraphics{../include/emcclogolarge} \\end{center}}\n \
\\newcommand{\\appendnote}[1]{\\vspace{6pt} \\\\ Note: #1}\n \
\\newcommand{\\altsol}{\\vspace{6pt} {\\bf Alternate solution:} }\n \
\\newcommand{\\dg}{^{\\circ}}\n \
\\newcommand{\\points}[1]{\n \
\\processifversion{alltest}{{[}#1{]}}\n \
\\processifversion{solotest}{{[}#1{]}}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{}\n \
}\n \
\\newcommand{\\problem}[1]{\n \
\\processifversion{alltest}{\\item #1}\n \
\\processifversion{solotest}{\\item #1}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{\\item #1}\n \
}\n \
\\newcommand{\\solution}[2]{\n \
\\processifversion{alltest}{}\n \
\\processifversion{solotest}{}\n \
\\processifversion{sol}{\\begin{sol*}The answer is \\fbox{#1}. \\\\ \\\\ #2 \\end{sol*} }\n \
\\processifversion{ans}{\\item #1}\n \
}\n \
\\newcommand{\\gutsround}[1]{\n \
\\processifversion{alltest}{\\subsection{Round #1}}\n \
\\processifversion{solotest}{\\subsection*{Round #1}}\n \
\\processifversion{ans}{\\subsection*{Round #1}}\n \
\\processifversion{sol}{\\subsection{Round #1}}\n \
}\n \
\\newcommand{\\gutsendround}{\n \
\\processifversion{alltest}{\\smallemcclogo}\n \
\\processifversion{solotest}{\\rule{\\linewidth-\\textwidth}{0.4pt} \\rule{\\textwidth}{0.4pt} }\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{}\n \
}\n \
\\newcommand{\\gutspagebreak}{\n \
\\processifversion{alltest}{}\n \
\\processifversion{solotest}{\\newpage}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{}\n \
}\n \
\\newcommand{\\specialmessage}[1]{\n \
\\processifversion{alltest}{#1}\n \
\\processifversion{solotest}{#1}\n \
\\processifversion{ans}{}\n \
\\processifversion{sol}{#1}\n \
}\n \
\\emccyear{" + round_year + "}\n \
\\emccdate{January 31, 2015}\n \
\\setlength{\\textheight}{8in}\n \
\\setlength{\\textwidth}{6.5in}\n \
\\setlength{\\topmargin}{0.0in}\n \
\\setlength{\\headheight}{0.5in}\n \
\\setlength{\\headsep}{0.3in}\n \
\\setlength{\\oddsidemargin}{-0.2in}\n \
\\setlength{\\evensidemargin}{-0.2in}\n \
\\setlength{\\parindent}{1pc}\n \
\\usepackage{fancyhdr}\n \
\\usepackage{lastpage}\n \
\\pagestyle{fancy}\n \
\\lhead{" + round_name + "}\n \
\\chead{\\sl Exeter Math Club Competition \\printyear\\ }\n \
\\rhead{page \\thepage\\ of \\pageref{LastPage}}\n \
\\lfoot{}\n \
\\cfoot{}\n \
\\rfoot{}\n \
\\begin{document}\n \
\\excludeversion{alltest}\n \
\\includeversion{solotest}\n \
\\excludeversion{sol}\n \
\\excludeversion{ans}\n \
{\\LARGE {\\bf " + round_name + "}}\n \
\\begin{flushright}\n \
{\\bf \\printdate\\ }\n \
\\end{flushright}\n \
\n \
{\\em \\noindent There are ?? problems, worth ?? points each, to be solved in ?? minutes. Answer each question to the best of your ability. Answers must be simplified and exact unless otherwise specified. There is no penalty for guessing. Be careful and don't rush.}\n \
\n \
\\begin{enumerate}\n";

var template_close = '\\end{enumerate}\n \
\n \
\\end{document}';

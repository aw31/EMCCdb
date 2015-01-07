'use strict';

// formatting code from http://stackoverflow.com/a/4673436/3376090
if (!String.format) {
  String.format = function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{%(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined' ? args[number] : match;
    });
  };
}

var del_button = ' <button class="btn btn-xs btn-secondary delete">' +
                    '<span class="glyphicon glyphicon-remove"></span></button>' +
                    '<span>&zwnj;</span><span class="placeholder"></span>';
var id_form = '<form class="add-form problem" id="1">' +
              '<input type="text" class="form-control" name="id" ' +
              'placeholder="Problem ID" /></form>';
var del_alert = 'Deleted. <a href="#" class="undo" id="{%0}">Undo?</a>';
var tag_div = '<div class="tags">{%0}</div>';
var tag = '<span class="btn btn-xs disabled tag">{%0}</span>';
var problem = '<div class="problem" id="{%0}">{%1}' + del_button +
              '</div><hr>';
var solution = '<div class="solution" id="{%0}-solution"{%2}>{%1}</div>' +
               '<hr class="solution"{%2}>';

var problems = new Object();

function renumber(){
  // renumbers problems during dragging
  var i = 0, drag_i;
  $('#round-body tr').each(function(){
    if(!$(this).hasClass('dragged')){
      $(this).find('.counter').first().html(++i);
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

function save(){
  // saves round
  var problem_ids = [];
  $('.problem').each(function(){
    problem_ids.push($(this).attr('id'));
  });
  $.ajax({
    type: 'POST',
    url: '/edit_round',
    data: {
      problems: JSON.stringify(problem_ids),
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
}

function getTeX(){
  // returns round -> TeX
  var output = '% ' + round_name + ' Problems\n\n';
  for(var i = 1; i <= round_length; i++){
    var row = $('#round-body tr:nth-child(' + i + ')');
    var id = row.find('.problem').attr('id');
    var prob = problems[id];
    if(prob){
      output += '% ' + prob.author + '\n';
      output += '\\problem{' + prob.problem + '}\n';
      output += '\\solution{' + prob.answer + '}{' + prob.solution + '}\n';
    } else {
      output += '% \n';
      output += '\\problem{???} \n'
      output += '\\solution{???}{???} \n'
    }
    output += '\n';
  }
  return output;
}

function make_tag(val){
  // returns a tag element containing 'val'
  if(val.length === 0) return String.format(tag, '?');
  return String.format(tag, val);
}

function set(row_id, id, index){
  // sets row with id row_id to problem with id id
  // index determines whether we use short or long id
  var row = $('#round-body tr:nth-child(' + row_id + ')');
  $.get('get_problem?problem_id=' + id + index, function(r){
    problems[r.id] = r;

    var prob = String.format(problem, r.id, latex_to_HTML(r.problem_clean));
    var hidden = ($('#solution-checkbox').is(':checked') ? '' : ' hidden');
    var sol = String.format(solution, r.id, latex_to_HTML(r.solution_clean), ' hidden');

    var tags = ''
    tags += make_tag(r.author);
    tags += make_tag(r.difficulty);
    for(var i = 0; i < r.tags.length; i++){
      tags += make_tag(r.tags[i]);
    }
    tags = String.format(tag_div, tags);

    row.find('input').attr('disabled', false);
    row.find('input').val('');
    row.find('td:nth-child(2)').html(prob + sol + tags);
    $('body').addClass('changed');
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  }).fail(function(){
    addStatus('Oops, the ID is invalid.', 'alert-danger');
    row.find('input').attr('disabled', false);
  });
}

function undo(del_row, del_id){
  // undoes delete by adding problem with id del_id to row del_row
  set(del_row, del_id, '');
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
    // adds delete button to each problem and inserts into Object problems
    if($(this).attr('id') != '1'){
      $(this).html(latex_to_HTML($(this).html()) + del_button);
      update_problem($(this).attr('id'));
    }
  });

  $('.solution').each(function(){
    $(this).html(latex_to_HTML($(this).html()));
  });

  $(document).on('mouseenter', 'td', function(){
    // shows delete button on mouseenter
    $(this).find('.delete').show();
    $(this).find('.placeholder').hide();
  });

  $(document).on('mouseleave', 'td', function(){
    // hides delete button on mouseleave
    $(this).find('.delete').hide();
    $(this).find('.placeholder').show();
  });

  $(document).on('click', '.undo', function(){
    // calls undo, fades delete status
    var params = $(this).attr('id').split('-');
    $(this).parent().parent().delay(500).fadeOut('slow');
    undo(params[0], params[1]);
  });

  $(document).on('click', '.delete', function(){
    // deletes problem in same cell as delete button
    var div = $(this).parent();
    var row = div.parent().parent();
    var id = div.attr('id');
    var row_id = row.find('.counter').html();
    div.attr('id', '1');
    div.parent().html(id_form);
    delete problems[id];
    $('body').addClass('changed');
    addStatus(String.format(del_alert, row_id + '-' + id), 'alert-success', 5000);
  });

  $(document).on('click', '.prob-link', function(e){
    // if problem is not empty, opens edit in new tab
    e.preventDefault();
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
    var row = form.parent().parent();
    var row_id = row.find('.counter').html();
    set(row_id, id, '&index=true');
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
    // calls save...
    save();
  });

  $('#solution-checkbox').click(function(){
    // toggles solutions
    $('.solution').toggle();
  });

  if($('#solution-checkbox').is(':checked')){
    $('.solution').show();
  }
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
    $('#' + id).html(latex_to_HTML(r.problem_clean) + del_button);
    $('#' + id + '-solution').html(latex_to_HTML(r.solution_clean));
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    var tags = ''
    tags += make_tag(r.author);
    tags += make_tag(r.difficulty);
    for(var i = 0; i < r.tags.length; i++){
      tags += make_tag(r.tags[i]);
    }
    $('#' + id).parent().find('.tags').html(tags);
    problems[r.id] = r;
  });
}

function update() {
  // gets and updates recently changed problems
  $.get('get_changes?date=' + last_update, function (r) {
    if(r.date) last_update = r.date;
    var ids = r.ids;
    if(ids === 'undefined') return;
    for (var i = 0; i < ids.length; i++) {
      update_problem(ids[i]);
    }
  });
}

setInterval(update, 5000);

$(window).bind('keydown', function(event) {
  // catches CTRL + s to save
  if (event.ctrlKey || event.metaKey) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
      case 's':
        event.preventDefault();
        save();
        break;
    }
  }
});

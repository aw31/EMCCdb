'use strict';

var delete_button = ' <button class="btn btn-xs btn-secondary delete">' +
                    '<span class="glyphicon glyphicon-remove"></span></button>' +
                    '<span>&zwnj;</span><span class="placeholder"></span>';
var id_form = '<form class="add-form problem" id="1">' +
              '<input type="text" class="form-control" name="id" ' + 
              'placeholder="Problem ID" /></form>';
var del_open = 'Deleted. <a href="javascript:void(0)" class="undo" id="';
var del_close = '">Undo?</a>';
var tag_div_open = '<hr><div class="tags">';
var tag_div_close = '</div>';
var tag_open = '<span class="btn btn-xs disabled tag">';
var tag_close = '</span>';

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

function save(){
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
}

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
  // returns a tag element containing 'tag'
  if(tag.length === 0) return tag_open + '?' + tag_close;
  return tag_open + tag + tag_close;
}

function set(row_id, id, index){
  // sets row with id row_id to problem with id id
  // index determines whether we use short or long id
  var row = $('#round-body tr:nth-child(' + row_id + ')');
  $.get('get_problem?problem_id=' + id + index, function(r){
    row.find('.raw').html(r.problem);
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
    row.find('input').attr('disabled', false);
    row.find('input').val('');
    row.find('td:nth-child(2)').html(prob);
    $('body').addClass('changed');
    MathJax.Hub.Queue(
      ["Typeset", MathJax.Hub]
    );
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
    // adds delete button to each problem
    if($(this).attr('id') != '1'){
      $(this).html(latex_to_HTML($(this).html()) + delete_button);
    }
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
    var params = $(this).attr('id').split(' ');
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
    row.find('.raw').html('');
    $('body').addClass('changed');
    addStatus(del_open + row_id + ' ' + id + del_close, 'alert-success', 5000);
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
    var tags = ''
    tags += make_tag(r.author);
    tags += make_tag(r.difficulty);
    for(var i = 0; i < r.tags.length; i++){
      tags += make_tag(r.tags[i]);
    }
    $('#' + id).parent().find('.tags').html(tags);
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


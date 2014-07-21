// cookie setting/getting (from http://stackoverflow.com/a/18652401/3376090)
function setCookie(key, value) {
  var expires = new Date();
  expires.setTime(expires.getTime() + (1 * 24 * 60 * 60 * 1000));
  document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
}

function getCookie(key) {
  var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');
  return keyValue ? keyValue[2] : null;
}

// manages filtering of tags in datatable
// set of filtered tags
var filtered = {};

function get_filtered(){
  var str = '';
  for(var v in filtered){
    str += v + ' ';
  }
  return str;
}

// redraws datatable with rows that contain elements of filtered
function filter(search){
  var button = '<button class="btn btn-xs btn-primary tag">';
  $('#filtered').empty();
  for(var v in filtered){
    $('#filtered').append(button + v + '</button>');
  }
  if(search){
    $('#problems_filter').children().children().val('');
    $('#problems').DataTable().search(get_filtered()).draw();
  }
}

// add/delete/toggles tag from filtered
function add(tag){
  filtered[tag] = true;
  filter(true);
}

function del(tag){
  delete filtered[tag];
  filter(true);
}

function toggle(tag){
  if(tag in filtered){
    del(tag);
  } else {
    add(tag);
  }
}

$(document).ready(function(){
  $(document).on('click', '.tag', function(){
    toggle($(this).html());
  });
  $(document).on('mouseenter mouseleave', '.answer', function(){
    $(this).children().toggle();
  });

  // compares difficulties of form "<button>75%</button>"
  jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "difficulty-pre": function(x){
      x = x.slice(x.indexOf('>') + 2);
      x = x.slice(0, x.indexOf('<'));
      if(x.slice(-2, -1) == "%") return parseInt(x.slice(0, -2));
      return 0;
    }, 
    "difficulty-desc": function(x, y){ return y - x; }, 
    "difficulty-asc": function(x, y){ return x - y; }
  });

  // compares IDs of form "<a href=blah>12</a>"
  jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "id-pre": function(x){
      x = x.slice(x.indexOf('>') + 1);
      x = x.slice(0, x.indexOf('<'));
      return parseInt(x);
    }, 
    "id-desc": function(x, y){ return y - x; }, 
    "id-asc": function(x, y){ return x - y; }
  });

  var tags = getCookie('tags');
  if(tags !== null){
    tags = tags.split(' ');
    for(var i = 0; i < tags.length; i++){
      if(tags[i].length === 0) continue;
      filtered[tags[i]] = true;
    }
  }

  // sets up datatable
  $('#problems').dataTable({
    'aoColumnDefs': [
      {
        'bSortable': true,
        'sType': 'id',
        'aTargets': [0]
      }, {
        'bSortable': true,
        'sType': 'difficulty',
        'aTargets': [2]
      }, {
        'sWidth': '40%',
        'aTargets': [1]
      }, {
        'sWidth': '30%',
        'aTargets': [5]
      }
    ],
    'bStateSave': true,
    'dom': '<fi<t>lp>',
    'fnDrawCallback': function() {
      MathJax.Hub.Queue(function(){MathJax.Hub.Typeset();});
      setCookie('tags', get_filtered());
    },
    'fnInitComplete': function() {
      var nodes = $('#problems').dataTable().fnGetNodes();
      for(var i = 0; i < nodes.length; i++){
        // converts stuff like \emph{blah} to html
        $(nodes[i]).find('.problem').each(function(){
          $(this).html(latex_to_HTML($(this).html()));
        });
      }

      var search = $('#problems_filter').children().children();
      search.keyup(function(){
        filtered = {};
        $('#filtered').empty();
      });
      search.attr('placeholder', 'id42');
      filter(false);
      if(get_filtered() !== ''){
        $('#problems_filter').children().children().val('');
      }
    },
    'iDisplayLength': 25
  });
});

function update_problem(r) {
  var table = $('#problems').DataTable();

  var prob = table.cell(r['index'] - 1, 1).data();
  var $prob = $(prob);
  $($prob[0]).html(r['problem'])
  $prob.find('.ans').html('<strong>Answer</strong>:' + r['answer'])
  prob_data = $('<div>').append($prob.clone()).html();
  table.cell(r['index'] - 1, 1).data(prob_data);

  var button = '<button class="btn btn-xs btn-primary tag">&zwnj;';
  var button_close = '&zwnj;</button>';

  if(r['difficulty'] == ''){
    r['difficulty'] = '?';
  }
  var diff_data = button + r['difficulty'] + button_close;
  table.cell(r['index'] - 1, 2).data(diff_data);

  var tag_data = ''
  for (var i = 0; i < r['tags'].length; i++) {
    tag_data += button + r['tags'][i] + button_close + ' ';
  }
  table.cell(r['index'] - 1, 3).data(tag_data);

  var author_data = button + r['author'] + button_close;
  table.cell(r['index'] - 1, 4).data(author_data);

  table.cell(r['index'] - 1, 5).data(r['comments']);
  
  table.row(r['index'] - 1).draw();
}

function update() {
  $.get('get_changes?date=' + last_update, function (r) {
    ids = r['ids'];
    for (var i = 0; i < ids.length; i++) {
      $.get('get_problem?problem_id=' + ids[i], function (r) {
        console.log(r);
        update_problem(r);
      });
      last_update = r['date'];
    }
  });
}

setInterval(update, 5000);

// get datatable to resize with window
$(window).bind('resize', function(){
  $('#problems').css('width', '100%');
});


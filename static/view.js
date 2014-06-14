// yummy cookie setting/getting (from http://stackoverflow.com/a/18652401/3376090)
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

// redraws datatable with rows that contain elements of filtered
function filter(search = true){
  table = $('#problems').DataTable();
  var str = '';
  $( '#filtered' ).empty();
  for(var v in filtered){
    str += v + ' ';
    button = '<button class="btn btn-xs btn-primary" style="margin: 10px 2px 10px 8px" onclick="toggle($( this ).html())">'
      $( '#filtered' ).append(button + v + '</button>');
  }
  if(search) table.search(str).draw();
}

// add/delete/toggles tag from filtered
function add(tag){
  filtered[tag] = true;
  filter();
}

function del(tag){
  delete filtered[tag];
  filter();
}

function toggle(tag){
  if(tag in filtered){
    del(tag);
  } else {
    add(tag);
  }
}

$(document).ready(function(){
  // converts stuff like \emph{blah} to html
  $('.problem').each(function(){
    $( this ).html(latex_to_HTML($( this ).html()));
  });

  // allows answer to be shown when hovering
  $('.answer').each(function(){
    $(this).hover(
      function(){ $( this ).children().toggle()},
      function(){ $( this ).children().toggle()}
    );
  });

  // compares dates of form "June 13, 2014, 2:52 p.m."
  jQuery.fn.dataTableExt.oSort["datetime-desc"] = function(x, y){
    function conv(x){
      split = x.split(" ");
      time = split[3];
      time_split = time.split(":");
      time_split[0] = (parseInt(time_split[0]) % 12);
      if(x.slice(-4, -3) == "p") time_split[0] += 12;
      time = time_split[0] + ":" + time_split[1];
      x = split[0] + " " + split[1] + " " + split[2] + " " + time;
      return x;
    }
    x_date = Date.parse(conv(x));
    y_date = Date.parse(conv(y));
    return y_date - x_date;
  };
  jQuery.fn.dataTableExt.oSort["datetime-asc"] = function(x, y){
    return jQuery.fn.dataTableExt.oSort["datetime-desc"](y, x);
  }

  // compares difficulties of form "<button>75%</button>"
  jQuery.fn.dataTableExt.oSort["difficulty-desc"] = function(x, y){
    function val(x){
      x = x.slice(x.indexOf('>') + 2);
      x = x.slice(0, x.indexOf('<'));
      if(x.slice(-2, -1) == "%") return parseInt(x.slice(0, -2));
      return 0;
    }
    return val(y) - val(x);
  };
  jQuery.fn.dataTableExt.oSort["difficulty-asc"] = function(x, y){
    return jQuery.fn.dataTableExt.oSort["difficulty-desc"](y, x);
  }

  var tags = getCookie('tags');
  if(tags != null){
    tags = tags.split(' ');
    for(var i = 0; i < tags.length; i++){
      if(tags[i].length == 0) continue;
      filtered[tags[i]] = true;
    }
  }

  // sets up datatable
  table = document.getElementById('problems');
  $( '#problems' ).dataTable({
    'aoColumnDefs': [
      {
        'bSortable': true,
        'sType': 'difficulty',
        'aTargets': [1]
      }, {
        'bSortable': true,
        'sType': 'datetime',
        'aTargets': [4]
      }, {
        'sWidth': '40%',
        'aTargets': [0]
      }, {
        'sWidth': '30%',
        'aTargets': [5]
      }
    ],
    'bStateSave': true,
    'dom': '<fi<t>lp>',
    'fnDrawCallback': function() {
      MathJax.Hub.Queue(function(){MathJax.Hub.Typeset();});
      var tags = '';
      for(var v in filtered){
        tags += v + ' ';
      }
      setCookie('tags', tags);
    },
    'fnInitComplete': function() {
      $( '#problems_filter' ).children().children().val('');
      filter(false);
    },
    'iDisplayLength': 50,
    'order': [[ 4, 'desc' ]]
  });

});

// get datatable to resize with window
$(window).bind('resize', function(){
  $('#problems').css('width', '100%');
});


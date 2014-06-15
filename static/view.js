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

function get_filtered(){
  var str = '';
  for(var v in filtered){
    str += v + ' ';
  }
  return str;
}

// redraws datatable with rows that contain elements of filtered
function filter(search){
  var button = '<button class="btn btn-xs btn-primary" style="margin: 10px 2px 10px 8px" onclick="toggle($( this ).html())">';
  $( '#filtered' ).empty();
  for(var v in filtered){
    $( '#filtered' ).append(button + v + '</button>');
  }
  if(search){
    $( '#problems_filter' ).children().children().val('');
    $( '#problems' ).DataTable().search(get_filtered()).draw();
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
  // converts stuff like \emph{blah} to html
  $( '.problem' ).each(function(){
    $( this ).html(latex_to_HTML($( this ).html()));
  });

  // allows answer to be shown when hovering
  $( '.answer' ).each(function(){
    $( this ).hover(
      function(){ $( this ).children().toggle(); },
      function(){ $( this ).children().toggle(); }
    );
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

  // compares IDs of form "<a href=blah>#12</a>"
  jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "id-pre": function(x){
      x = x.slice(x.indexOf('#') + 1);
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
  $( '#problems' ).dataTable({
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
      $( '#problems_filter' ).children().children().keyup(function(){
        filtered = {};
        $( '#filtered' ).empty();
      });
      filter(false);
      if(get_filtered() !== ''){
        $( '#problems_filter' ).children().children().val('');
      }
    },
    'iDisplayLength': 25
  });

});

// get datatable to resize with window
$( window ).bind('resize', function(){
  $( '#problems' ).css('width', '100%');
});


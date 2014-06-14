// manages filtering of tags in datatable
// set of filtered tags
var filtered = {};

// redraws datatable with rows that contain elements of filtered
function filter(){
  table = $('#problems').DataTable();
  var str = '';
  $( '#filtered' ).empty();
  for(var v in filtered){
    str += v + ' ';
    button = '<button class="btn btn-xs btn-primary" style="margin: 10px 2px 10px 8px" onclick="toggle($( this ).html())">'
      $( '#filtered' ).append(button + v + '</button>');
  }
  table.search(str).draw();
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

  // sets up datatable
  table = document.getElementById("problems");
  $( '#problems' ).dataTable({
    fnDrawCallback: function() {
      MathJax.Hub.Queue(function(){MathJax.Hub.Typeset();})
    },
    "aoColumnDefs": [
  {
    "bSortable": true,
    "sType": "difficulty",
    "aTargets": [1]
  }, {
    "bSortable": true,
    "sType": "datetime",
    "aTargets": [4]
  }, {
    "sWidth": "40%",
    "aTargets": [0]
  }, {
    "sWidth": "30%",
    "aTargets": [5]
  }

  ],
    "order": [[ 4, "desc" ]],
    "iDisplayLength": 50,
    "dom": '<fi<t>lp>'
  });
});

// get datatable to resize with window
$(window).bind('resize', function(){
  $('#problems').css('width', '100%');
});


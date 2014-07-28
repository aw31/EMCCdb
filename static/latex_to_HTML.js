// parses input string, replacing LaTeX emph, textbf, textit and underline with appropriate HTML
// this assumes that the user does not randomly throw around '{' and '}'
// TODO: write something more robust
function latex_to_HTML(str){
  str = str.replace('\\{', '\uFFFC');
  str = str.replace('\\}', '\uFFFD');

  var token = ['\\emph{', '\\textbf{', '\\textit{', '\\underline{'];
  var html = ['em', 'b', 'i', 'u'];
  var seen = [], index = [];
  var res = '';
  var len = str.length;
  for(var i = 0; i < len; i++){
    if(str.charAt(i) == '{' && str.charAt(i - 1) != '\\'){
      seen.push('');
      index.push(res.length);
      continue;
    }
    if(str.charAt(i) == '}' && str.charAt(i - 1) != '\\'){
      if(seen[seen.length - 1].length > 0){
        res =
          res.slice(0, index[index.length - 1]) +
          '<' + seen[seen.length - 1] + '>' +
          res.slice(index[index.length - 1]) +
          '</' + seen[seen.length - 1] + '>';
      } else {
        res =
          res.slice(0, index[index.length - 1]) +
          '{' + res.slice(index[index.length - 1]) + '}';
      }
      seen.pop();
      index.pop();
      continue;
    }

    var done = 0;
    for(var j = 0; j < token.length; j++){
      if(i + token[j].length <= len){
        var substr = str.substring(i, i + token[j].length);
        if(substr == token[j]){
          seen.push(html[j]);
          index.push(res.length);
          i += token[j].length - 1;
          done = 1;
          break;
        }
      }
    }
    if(done == 0){
      if(str.charAt(i) == '{'){
        res = res.slice(0, -1);
      }
      if(str.charAt(i) == '}'){
        res = res.slice(0, -1);
      }
      res += str.charAt(i);
    }
  }

  res = res.replace('\uFFFC', '\\{');
  res = res.replace('\uFFFD', '\\}');
  return res;
}


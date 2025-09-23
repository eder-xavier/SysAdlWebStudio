(function(global) {
  function executeSysADL() {
    const editor = document.querySelector(".CodeMirror").CodeMirror;
    const code = editor.getValue();
    const logElement = document.getElementById("log");
    const jsOutputElement = document.getElementById("jsOutput");
    global.SysADL.executeSysADLCode(code, logElement, jsOutputElement);
  }

  global.SysADL = global.SysADL || {};
  global.SysADL.executeSysADL = executeSysADL;
})(window);
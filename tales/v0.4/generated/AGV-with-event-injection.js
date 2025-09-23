Detected environment/scenario elements. Generating two files...
DEBUG: Processing equation for SendStartMotorEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (cmd == CommandToMotor.start)
DEBUG: Processing equation for SendDestinationEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (destination == move.destination)
DEBUG: Processing equation for NotifyAGVFromMotorEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (outStatusMotor == inStatusMotor)
DEBUG: Processing equation for SendCommandEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (cmd == move.command)
DEBUG: Processing equation for NotifySupervisoryFromMotorEQ, expression type: ConditionalExpression
DEBUG: Processing ConditionalExpression
DEBUG: Transformed equation: ((statusMotor == NotificationFromMotor.started) ? (ack == NotificationToSupervisory.departed) : (ack == NotificationToSupervisory.traveling))
DEBUG: Processing equation for NotificationMotorIsStartedEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (statusMotor == NotificationFromMotor.started)
DEBUG: Processing equation for CompareStationsEQ, expression type: ConditionalExpression
DEBUG: Processing ConditionalExpression
DEBUG: Transformed equation: ((dest == loc) ? (result == true) : (result == false))
DEBUG: Processing equation for StopMotorEQ, expression type: ConditionalExpression
DEBUG: Processing ConditionalExpression
DEBUG: Transformed equation: ((result == true) ? (cmd == CommandToMotor.stop) : (cmd == SysADL.types.Void))
DEBUG: Processing equation for PassedMotorEQ, expression type: ConditionalExpression
DEBUG: Processing ConditionalExpression
DEBUG: Transformed equation: ((result == false) ? (ack == NotificationToSupervisory.passed) : (ack == SysADL.types.Void))
DEBUG: Processing equation for SendCurrentLocationEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (outLocation == inLocation)
DEBUG: Processing equation for ControlArmEQ, expression type: ConditionalExpression
DEBUG: Processing ConditionalExpression
DEBUG: Transformed equation: ((statusMotor == NotificationFromMotor.stopped) ? (startArm == cmd) : (startArm == CommandToArm.idle))
DEBUG: Processing equation for NotifierArmEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (ack == NotificationToSupervisory.arrived)
DEBUG: Processing equation for VehicleTimerEQ, expression type: BinaryExpression
DEBUG: Transformed equation: (((s.destination == dest) && (s.location == loc)) && (s.command == cmd))
DEBUG: Executable function - params: ["move"], body: return CommandToMotor.start;
DEBUG: Executable function - params: ["move"], body: return move.command;
DEBUG: Executable function - params: ["move"], body: return move.destination;
DEBUG: Executable function - params: ["statusMotor"], body: return statusMotor;
DEBUG: Executable function - params: ["statusMotor"], body: if (statusMotor == NotificationFromMotor.started) {
          return NotificationToSupervisory.departed;
        } else {
          return NotificationToSupervisory.traveling;
        }
DEBUG: Executable function - params: ["destination","location","statusMotor"], body: if(statusMotor == NotificationFromMotor.started && destination == location) {
          return true;
        } else {
          return false;
        }
DEBUG: Executable function - params: ["comparisonResult"], body: if(comparisonResult == true) {
          return CommandToMotor.stop;
        } else {
          return null;
        }
DEBUG: Executable function - params: ["comparisonResult"], body: if(comparisonResult == false) {
          return NotificationToSupervisory.passed;
        } else {
          return null;
        }
DEBUG: Executable function - params: ["location"], body: return location;
DEBUG: Executable function - params: ["statusMotor","cmd"], body: if(statusMotor == NotificationFromMotor.stopped) {
          return cmd;
        } else {
          return CommandToArm.idle;
        }
DEBUG: Executable function - params: ["statusArm"], body: return NotificationToSupervisory.arrived;
DEBUG: Executable function - params: ["location","cmd","destination"], body: let s;
		s.destination = destination;
		s.location = location;
		s.command = cmd;
		
		return s;
Generated traditional model: /Users/tales/desenv/SysAdlWebStudio/tales/v0.4/generated/AGV-completo.js
Generated environment/scenario model: /Users/tales/desenv/SysAdlWebStudio/tales/v0.4/generated/AGV-completo-env-scen.js

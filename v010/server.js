import express from 'express';
import bodyParser from 'body-parser';
import { parseSysADL } from './parser.js';
import { generateJS } from './codeGenerator.js';
import { simulate } from './simulator.js';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/parse', (req, res) => {
    const sysadlCode = req.body.code;
    const parserResult = parseSysADL(sysadlCode);
    const jsCode = generateJS(parserResult.ast);
    res.json({
        parserLog: parserResult.log,
        jsCode: jsCode
    });
});

app.post('/simulate', (req, res) => {
    const jsCode = req.body.code;
    const output = simulate(jsCode);
    res.json({ output });
});

app.listen(3000, () => console.log('Server running on port 3000'));
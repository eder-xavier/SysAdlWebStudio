# SIMULATOR v0.2

O `tales/v0.2/simulator.js` carrega modelos gerados em `tales/v0.2/generated` e permite modos de execução:

Flags
- `--loop` / `-l`: modo contínuo
- `--count N`: número de ticks
- `--interval MS`: intervalo entre ticks
- `--ports a,b,c`: lista de portas (component.port ou apenas portName)
- `--stream`: imprimir eventos em tempo real

Exemplo
```
node tales/v0.2/simulator.js tales/v0.2/generated/RTC.js --loop --count 5 --interval 500 --ports rtc.localtemp1,rtc.localTemp2 --stream
```


package com.futty.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin do próprio app (fora do package.json): o Capacitor só o acha se for registrado antes de a ponte subir.
        registerPlugin(ConviteDaLojaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

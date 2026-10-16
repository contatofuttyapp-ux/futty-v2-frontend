package com.futty.app;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * O referrer da instalação pela Play Store (Play Install Referrer). A página do convite manda à Play com "convite=<código>" no
 * referrer; o JS (src/lib/conviteDaLoja.js) lê aqui, uma vez, e põe a pessoa no time. Plugin nosso e mínimo, de propósito: não mexe no
 * iPhone e não entra no package.json (o Capgo não vê plugin nativo novo, o bundle continua compatível com o app da loja).
 *
 * lerReferrer() → { referrer: String | null, suportado: boolean }. Play fora do ar ou sem resposta: rejeita, e o JS tenta na próxima
 * abertura. Aparelho sem Play Store (FEATURE_NOT_SUPPORTED): referrer null.
 */
@CapacitorPlugin(name = "ConviteDaLoja")
public class ConviteDaLojaPlugin extends Plugin {

    @PluginMethod
    public void lerReferrer(final PluginCall call) {
        final InstallReferrerClient cliente = InstallReferrerClient.newBuilder(getContext()).build();
        // A Play pode chamar de volta mais de uma vez (desconectou e reconectou): a resposta ao JS sai uma vez só.
        final AtomicBoolean respondido = new AtomicBoolean(false);
        try {
            cliente.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int codigo) {
                    if (respondido.getAndSet(true)) return;
                    try {
                        if (codigo == InstallReferrerClient.InstallReferrerResponse.OK) {
                            ReferrerDetails detalhes = cliente.getInstallReferrer();
                            JSObject r = new JSObject();
                            r.put("referrer", detalhes.getInstallReferrer());
                            r.put("suportado", true);
                            call.resolve(r);
                        } else if (codigo == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED) {
                            JSObject r = new JSObject();
                            r.put("referrer", null);
                            r.put("suportado", false);
                            call.resolve(r);
                        } else {
                            call.reject("A Play Store não respondeu (" + codigo + ").", "INDISPONIVEL");
                        }
                    } catch (Exception e) {
                        call.reject("Não deu para ler o referrer.", "INDISPONIVEL", e);
                    } finally {
                        try { cliente.endConnection(); } catch (Exception ignorado) { }
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    if (respondido.getAndSet(true)) return;
                    call.reject("A Play Store desconectou.", "INDISPONIVEL");
                }
            });
        } catch (Exception e) {
            if (!respondido.getAndSet(true)) call.reject("Não deu para ler o referrer.", "INDISPONIVEL", e);
        }
    }
}

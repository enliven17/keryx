# Keryx CLI

The standalone CLI installs a Claude Code status surface and runs the Keryx earning daemon.

~~~bash
keryx setup
keryx status
keryx stop
keryx uninstall
~~~

The daemon polls the ad server, waits until the status line is rendered, and sends an impression with the local earner address. The server stores it in Neon and later anchors it through SourceEngagement; verified settlement is completed by Attestcoin on Creditcoin.

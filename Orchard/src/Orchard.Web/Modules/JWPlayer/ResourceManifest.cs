using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Orchard.UI.Resources;

namespace JWPlayer {
    public class ResourceManifest : IResourceManifestProvider {

        public void BuildManifests(ResourceManifestBuilder builder) {
            var manifest = builder.Add();
            manifest.DefineScript("jwplayer").SetUrl("jwplayer.js");
        }
    }
}

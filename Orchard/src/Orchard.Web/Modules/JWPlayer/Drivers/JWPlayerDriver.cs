using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Orchard.ContentManagement.Drivers;
using JWPlayer.Models;
using Orchard.ContentManagement;

namespace JWPlayer.Drivers {
    public class JWPlayerDriver : ContentPartDriver<JWPlayerPart> {

        protected override DriverResult Display(JWPlayerPart part,
        string displayType, dynamic shapeHelper) {

            return ContentShape("Parts_JWPlayer",
                        () => shapeHelper.Parts_JWPlayer(
                              MediaFile: part.MediaFile,
                              PlayerSource: part.PlayerSource,
                              Width: part.Width,
                              Height: part.Height,
                              AutoStart: part.AutoStart,
                              Repeat: part.Repeat));

        }

        protected override DriverResult Editor(JWPlayerPart part,
                        dynamic shapeHelper) {

            return ContentShape("Parts_JWPlayer_Edit",
                            () => shapeHelper.EditorTemplate(
                                TemplateName: "Parts/JWPlayer",
                                Model: part,
                                Prefix: Prefix));
        }

        protected override DriverResult Editor(JWPlayerPart part,
                IUpdateModel updater,
                dynamic shapeHelper) {

            updater.TryUpdateModel(part, Prefix, null, null);
            return Editor(part, shapeHelper);
        }

    }

}

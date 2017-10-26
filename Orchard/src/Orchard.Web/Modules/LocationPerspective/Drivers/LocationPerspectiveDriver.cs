using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Orchard.ContentManagement.Drivers;
using Orchard.ContentManagement;
using LocationPerspective.Models;

namespace LocationPerspective.Drivers {
    public class JWPlayerDriver : ContentPartDriver<LocationPerspectivePart> {

        protected override DriverResult Display(LocationPerspectivePart part,
        string displayType, dynamic shapeHelper) {

            return ContentShape("Parts_LocationPerspective",
                        () => shapeHelper.Parts_LocationPerspective(                              
                              SourceDocuments: part.SourceDocuments,
                              MapType: part.MapType,
                              Width: part.Width,
                              Height: part.Height));

        }

        protected override DriverResult Editor(LocationPerspectivePart part,
                        dynamic shapeHelper) {

            return ContentShape("Parts_LocationPerspective_Edit",
                            () => shapeHelper.EditorTemplate(
                                TemplateName: "Parts/LocationPerspective",
                                Model: part,
                                Prefix: Prefix));
        }

        protected override DriverResult Editor(LocationPerspectivePart part,
                IUpdateModel updater,
                dynamic shapeHelper) {

            updater.TryUpdateModel(part, Prefix, null, null);
            return Editor(part, shapeHelper);
        }

    }

}

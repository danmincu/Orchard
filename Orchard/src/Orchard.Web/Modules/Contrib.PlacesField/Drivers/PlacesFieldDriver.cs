using Orchard.ContentManagement.Drivers;
using Contrib.PlacesField.Settings;
using Orchard.ContentManagement;
using Contrib.PlacesField.ViewModels;

namespace Contrib.PlacesField.Drivers
{

    public class PlacesFieldDriver : ContentFieldDriver<Fields.PlacesField>
    {
        protected override DriverResult Display(ContentPart part,
                                Fields.PlacesField field,
                                string displayType,
                                dynamic shapeHelper)
        {

            var settings = field.PartFieldDefinition
                                .Settings
                                .GetModel<PlacesFieldSettings>();

            return ContentShape("Fields_Contrib_Places",
                    field.Name,
                    s => s.Name(field.Name)
                    .PlaceName(field.PlaceName)
                    .PlaceLatLong(field.PlaceLatLong)
                    .ShowLink(settings.DisplayOptions ==
                        PlacesFieldDisplayOptions.NameAndLinkToMap)
                    .ShowMap(settings.DisplayOptions ==
                        PlacesFieldDisplayOptions.NameAndEmbeddedMap)
                    );
        }

        protected override DriverResult Editor(ContentPart part,
                                 Fields.PlacesField field,
                                 dynamic shapeHelper)
        {

            var settings = field.PartFieldDefinition
                        .Settings.GetModel<PlacesFieldSettings>();
            var viewModel = new PlacesFieldViewModel
            {
                Name = field.Name,
                Category = field.Category,
                PostalCode = field.PostalCode,
                ShowLink = settings.DisplayOptions
                    == PlacesFieldDisplayOptions.NameAndLinkToMap,
                ShowMap = settings.DisplayOptions
                    == PlacesFieldDisplayOptions.NameAndEmbeddedMap,
                PlaceName = field.PlaceName,
                PlaceLatLong = field.PlaceLatLong
            };

            return ContentShape("Fields_Contrib_Places_Edit",
                        () => shapeHelper.EditorTemplate(
                        TemplateName: "Fields/Contrib.Places",
                        Model: viewModel,
                        Prefix: getPrefix(field, part)
                        ));
        }

        protected override DriverResult Editor(ContentPart part,
                           Fields.PlacesField field,
                           IUpdateModel updater,
                           dynamic shapeHelper)
        {

            var viewModel = new PlacesFieldViewModel();

            if (updater.TryUpdateModel(viewModel,
                             getPrefix(field, part), null, null))
            {

                var settings = field.PartFieldDefinition
                      .Settings.GetModel<PlacesFieldSettings>();


                field.Category = viewModel.Category;
                field.PostalCode = viewModel.PostalCode;
                field.PlaceName = viewModel.PlaceName;
                field.PlaceLatLong = viewModel.PlaceLatLong;

                viewModel.ShowLink = settings.DisplayOptions
                    == PlacesFieldDisplayOptions.NameAndLinkToMap;
                viewModel.ShowMap = settings.DisplayOptions
                    == PlacesFieldDisplayOptions.NameAndEmbeddedMap;

            }

            return Editor(part, field, shapeHelper);
        }

        private static string getPrefix(ContentField field,
                            ContentPart part)
        {
            return (part.PartDefinition.Name + "." + field.Name)
                 .Replace(" ", "_");
        }

    }

}

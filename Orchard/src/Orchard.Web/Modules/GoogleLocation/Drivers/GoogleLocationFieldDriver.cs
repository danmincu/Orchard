using Orchard.ContentManagement.Drivers;
using GoogleLocation.Settings;
using Orchard.ContentManagement;
using GoogleLocation.ViewModels;

namespace GoogleLocation.Drivers
{

    public class GoogleLocationFieldDriver : ContentFieldDriver<GoogleLocation.Fields.GoogleLocationField>
    {
        protected override DriverResult Display(ContentPart part,
                                GoogleLocation.Fields.GoogleLocationField field,
                                string displayType,
                                dynamic shapeHelper)
        {

            var settings = field.PartFieldDefinition
                                .Settings
                                .GetModel<GoogleLocationFieldSettings>();

            return ContentShape("Fields_GoogleLocation",
                    field.Name,
                    s => 
                    //s.Name(field.Name)
                    //.PlaceName(field.PlaceName)
                    //.PlaceLatLong(field.PlaceLatLong)
                    s.LocationLatLong(field.LocationLatLong)
                    .ShowLink(settings.DisplayOptions ==
                        GoogleLocationFieldDisplayOptions.NameAndLinkToMap)
                    .ShowMap(settings.DisplayOptions ==
                        GoogleLocationFieldDisplayOptions.NameAndEmbeddedMap)
                    );
        }

        protected override DriverResult Editor(ContentPart part,
                                 GoogleLocation.Fields.GoogleLocationField field,
                                 dynamic shapeHelper)
        {

            var settings = field.PartFieldDefinition
                        .Settings.GetModel<GoogleLocationFieldSettings>();
            var viewModel = new GoogleLocationFieldViewModel
            {
                Name = field.Name,
                Category = field.Category,
                PostalCode = field.PostalCode,
                ShowLink = settings.DisplayOptions
                    == GoogleLocationFieldDisplayOptions.NameAndLinkToMap,
                ShowMap = settings.DisplayOptions
                    == GoogleLocationFieldDisplayOptions.NameAndEmbeddedMap,
                PlaceName = field.PlaceName,
                PlaceLatLong = field.PlaceLatLong,
                LocationLatLong = field.LocationLatLong
            };

            return ContentShape("Fields_Google_Location_Edit",
                        () => shapeHelper.EditorTemplate(
                        TemplateName: "Fields/GoogleLocation",
                        Model: viewModel,
                        Prefix: getPrefix(field, part)
                        ));
        }

        protected override DriverResult Editor(ContentPart part,
                           GoogleLocation.Fields.GoogleLocationField field,
                           IUpdateModel updater,
                           dynamic shapeHelper)
        {

            var viewModel = new GoogleLocationFieldViewModel();

            if (updater.TryUpdateModel(viewModel,
                             getPrefix(field, part), null, null))
            {

                var settings = field.PartFieldDefinition
                      .Settings.GetModel<GoogleLocationFieldSettings>();


                field.Category = viewModel.Category;
                field.PostalCode = viewModel.PostalCode;
                field.PlaceName = viewModel.PlaceName;
                field.PlaceLatLong = viewModel.PlaceLatLong;
                field.LocationLatLong = viewModel.LocationLatLong;

                viewModel.ShowLink = settings.DisplayOptions
                    == GoogleLocationFieldDisplayOptions.NameAndLinkToMap;
                viewModel.ShowMap = settings.DisplayOptions
                    == GoogleLocationFieldDisplayOptions.NameAndEmbeddedMap;

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

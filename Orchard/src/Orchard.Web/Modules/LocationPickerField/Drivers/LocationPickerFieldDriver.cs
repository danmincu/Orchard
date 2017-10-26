using Orchard.ContentManagement.Drivers;
using LocationPickerField.Settings;
using Orchard.ContentManagement;
using LocationPickerField.ViewModels;

namespace LocationPickerField.Drivers
{

    public class LocationPickerFieldDriver : ContentFieldDriver<LocationPickerField.Fields.LocationPickerField>
    {
        protected override DriverResult Display(ContentPart part,
                                LocationPickerField.Fields.LocationPickerField field,
                                string displayType,
                                dynamic shapeHelper)
        {

            var settings = field.PartFieldDefinition
                                .Settings
                                .GetModel<LocationPickerFieldSettings>();

            return ContentShape("Fields_LocationPickerField",
                    field.Name,
                    s => 
                    //s.Name(field.Name)
                    s.PlaceName(field.PlaceName)
                    //.PlaceLatLong(field.PlaceLatLong)
                    .LocationLatLong(field.LocationLatLong)
                    .ShowLink(settings.SaveOptions ==
                        LocationPickerFieldDisplayOptions.LocationDouble)
                    .ShowMap(settings.SaveOptions ==
                        LocationPickerFieldDisplayOptions.LocationAsStringAndDouble)
                    );
        }

        protected override DriverResult Editor(ContentPart part,
                                 LocationPickerField.Fields.LocationPickerField field,
                                 dynamic shapeHelper)
        {

            var settings = field.PartFieldDefinition
                        .Settings.GetModel<LocationPickerFieldSettings>();
            var viewModel = new LocationPickerFieldViewModel
            {
                Name = field.Name,
                
                ShowLink = settings.SaveOptions
                    == LocationPickerFieldDisplayOptions.LocationDouble,
                ShowMap = settings.SaveOptions
                    == LocationPickerFieldDisplayOptions.LocationAsStringAndDouble,                
                LocationLatLong = field.LocationLatLong
            };

            return ContentShape("Fields_Location_Picker_Field_Edit",
                        () => shapeHelper.EditorTemplate(
                        TemplateName: "Fields/LocationPickerField",
                        Model: viewModel,
                        Prefix: getPrefix(field, part)
                        ));
        }

        protected override DriverResult Editor(ContentPart part,
                           LocationPickerField.Fields.LocationPickerField field,
                           IUpdateModel updater,
                           dynamic shapeHelper)
        {

            var viewModel = new LocationPickerFieldViewModel();

            if (updater.TryUpdateModel(viewModel,
                             getPrefix(field, part), null, null))
            {

                var settings = field.PartFieldDefinition
                      .Settings.GetModel<LocationPickerFieldSettings>();


                field.PlaceName = viewModel.PlaceName;
                field.LocationLatLong = viewModel.LocationLatLong;

                viewModel.ShowLink = settings.SaveOptions
                    == LocationPickerFieldDisplayOptions.LocationDouble;
                viewModel.ShowMap = settings.SaveOptions
                    == LocationPickerFieldDisplayOptions.LocationAsStringAndDouble;

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

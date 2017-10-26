using Orchard;
using Orchard.ContentManagement;
using Orchard.ContentManagement.Records;
using Orchard.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace LocationPerspective.Controllers
{
    public class DocumentLocationController : Controller
    {
        IOrchardServices services;

        public DocumentLocationController(IOrchardServices services, IRepository<ContentItemRecord> repo)
        {
            this.services = services;
            ////var allOfThem = repo.Fetch(a => true).Where(c => c.ContentType.Name.Equals("Locationtester", StringComparison.OrdinalIgnoreCase));
            ////var aot = allOfThem.FirstOrDefault();           
        }

        [AllowCrossSiteJson]
        public ActionResult GetAll(String sourceDocuments)
        {
            var list = this.services.ContentManager.Query().List().Where(ci => ci.ContentType.Equals(sourceDocuments, StringComparison.OrdinalIgnoreCase));
            var locationDocuments = list.Select(ci => new
            {
                id = ci.Record.Id,
                location = ci.Parts.Where(c => c.GetType() == typeof(Orchard.ContentManagement.ContentPart))
                        .Select(p => p.Fields.OfType<LocationPickerField.Fields.LocationPickerField>().Select(f => f.LocationLatLong).FirstOrDefault()).FirstOrDefault(),
                path = ci.Parts
                    .OfType<Orchard.Autoroute.Models.AutoroutePart>().Select(p => p.Path).FirstOrDefault(),
                title = ci.Parts
                    .OfType<Orchard.Core.Title.Models.TitlePart>().Select(p => p.Title).FirstOrDefault(),
                utcTime = ci.Parts
                    .OfType<Orchard.Core.Common.Models.CommonPart>().Select(p => p.PublishedUtc).FirstOrDefault()
            });
            var ld = locationDocuments;
            var json = Json(locationDocuments, JsonRequestBehavior.AllowGet);
            return json.ToJsonp();
        }
    }

    public class AllowCrossSiteJsonAttribute : ActionFilterAttribute
    {
        public override void OnActionExecuting(ActionExecutingContext filterContext)
        {
            filterContext.RequestContext.HttpContext.Response.AddHeader("Access-Control-Allow-Origin", "*");
            filterContext.RequestContext.HttpContext.Response.AddHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            filterContext.RequestContext.HttpContext.Response.AddHeader("Access-Control-Allow-Credentials", "true");
            base.OnActionExecuting(filterContext);
        }
    }

    public class JsonpResult : System.Web.Mvc.JsonResult
    {
        public override void ExecuteResult(ControllerContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException("context");
            }

            HttpResponseBase response = context.HttpContext.Response;

            if (!String.IsNullOrEmpty(ContentType))
            {
                response.ContentType = ContentType;
            }
            else
            {
                response.ContentType = "application/javascript";
            }
            if (ContentEncoding != null)
            {
                response.ContentEncoding = ContentEncoding;
            }
            if (Data != null)
            {
                // The JavaScriptSerializer type was marked as obsolete prior to .NET Framework 3.5 SP1
#pragma warning disable 0618
                HttpRequestBase request = context.HttpContext.Request;

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                if (string.IsNullOrEmpty(request.Params["jsoncallback"]))
                    response.Write(serializer.Serialize(Data));
                else
                    response.Write(request.Params["jsoncallback"] + "(" + serializer.Serialize(Data) + ")");
#pragma warning restore 0618
            }
        }
    }

    public static class JsonResultExtensions
    {
        public static JsonpResult ToJsonp(this JsonResult json)
        {
            return new JsonpResult { ContentEncoding = json.ContentEncoding, ContentType = json.ContentType, Data = json.Data, JsonRequestBehavior = json.JsonRequestBehavior };
        }
    }
}

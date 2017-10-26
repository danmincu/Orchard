using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using YelpSharp;
using YelpSharp.Data.Options;

public class YelpController : Controller
{

	private readonly Yelp _client;

	public YelpController()
	{


     /*   Consumer Key	VaCwXAMDgHwJbl-DnCZP5g
Consumer Secret	8Oo9rEnOsUWAAJT1b2qpmkD48AQ
Token	3OTzOLtbJ44QzFeDiG-lwqzTHoXLe2D_
Token Secret	5K468NE_wTiAbJBy1oqduw8BwTc
        */

		var options = new Options()
		{
			AccessToken = "3OTzOLtbJ44QzFeDiG-lwqzTHoXLe2D_",
			AccessTokenSecret = "5K468NE_wTiAbJBy1oqduw8BwTc",
			ConsumerKey = "VaCwXAMDgHwJbl-DnCZP5g",
			ConsumerSecret = "8Oo9rEnOsUWAAJT1b2qpmkD48AQ"
		};

		_client = new Yelp(options);
	}

	public YelpController(Yelp client)
	{
		_client = client;
	}

	public ActionResult Places(string postalCode,
					string category, string term)
	{

		var so = new SearchOptions()
		{
			LocationOptions = new LocationOptions()
			{
				location = postalCode
			},
			GeneralOptions = new GeneralOptions()
			{
				category_filter = category,
				term = term
			}
		};
		var results = _client.Search(so);

		return Json(results.Result.businesses
			.Where(p => p.name.StartsWith(term))
			.Select(
			p => new
			{
				value = p.location.coordinate.latitude + "~"
				   + p.location.coordinate.longitude,
				label = p.name
			}).ToArray()
			, JsonRequestBehavior.AllowGet);
	}

	public ActionResult Categories(string postalCode,
					string categories, string term)
	{

		var categoryList = new List<string> { 
			"Restaurants", "Nightlife", "Arts"
		};

		var results = string.IsNullOrEmpty(term) ?
			categoryList : categoryList
				.Where(c =>
					c.ToLower()
					.Contains(term.ToLower()));
		return Json(results.Select(
			c => new { value = c.ToLower(), label = c })
			.ToArray(), JsonRequestBehavior.AllowGet);
	}
}
